import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import route handlers
import { setupFileRoutes } from "./routes/files.js";
import { setupAIRoutes } from "./routes/ai.js";
import { setupGitRoutes } from "./routes/git.js";
import { setupLintRoutes } from "./routes/lint.js";
import { setupTerminalWebSocket } from "./websockets/terminal.js";
import { setupCollaborationWebSocket } from "./websockets/collaboration.js";
import { devAuth } from "./middleware/auth.js";

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8000;

// Security and performance middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());
app.use(morgan("dev")); // More concise logging for development

// CORS configuration - allow all in development
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Development authentication bypass
app.use(devAuth);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: process.uptime(),
    user: req.user, // Show the authenticated user
  });
});

// API status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "connected",
    user: req.user,
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      filesystem: true,
      terminal: true,
      git: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// Setup route handlers
setupFileRoutes(app);
setupAIRoutes(app);
setupGitRoutes(app);
setupLintRoutes(app);

// WebSocket setup with CORS support
const wss = new WebSocketServer({
  server,
  path: "/ws",
  clientTracking: true,
});

// Handle WebSocket server errors
wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});

// Handle new WebSocket connections
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Route WebSocket connections based on path
  if (path === "/ws/terminal") {
    setupTerminalWebSocket(ws, req);
  } else if (path === "/ws/collaboration") {
    setupCollaborationWebSocket(ws, req);
  } else if (path === "/ws/git") {
    // Handle git WebSocket if needed
  } else if (path === "/ws/mcp") {
    // Handle MCP WebSocket if needed
  } else {
    console.warn("Unknown WebSocket path:", path);
    ws.close(1003, "Unknown WebSocket endpoint");
  }

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
  });
});

console.log("🔌 WebSocket server is running on /ws");

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(process.cwd(), "../frontend/dist");
  app.use(express.static(frontendPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Vybe AI OS Backend Server running on http://localhost:${PORT}`,
  );
  console.log(`💡 WebSocket server ready for connections`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `👤 Development user: ${JSON.stringify({
      id: "dev-user",
      username: "developer",
      email: "dev@example.com",
    })}`,
  );
  console.log(`💾 Process ID: ${process.pid}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log("🛑 Shutting down server...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
