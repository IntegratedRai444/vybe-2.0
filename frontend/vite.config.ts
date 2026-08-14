import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            ["@babel/plugin-proposal-class-properties", { loose: true }],
          ],
        },
      }),
      svgr(),
      nodePolyfills(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
        manifest: {
          name: "Vybe IDE",
          short_name: "Vybe",
          description: "Modern Web IDE",
          theme_color: "#ffffff",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
      mode === "analyze" &&
        visualizer({
          open: true,
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    // Base public path when served in development or production
    base: env.VITE_BASE_URL || "/",

    // Directory to serve as plain static assets
    publicDir: "public",

    // Adjust chunk size warning limit
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            ui: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-tabs",
            ],
            editor: ["@monaco-editor/react", "monaco-editor"],
            ai: ["openai", "langchain"],
          },
        },
      },
    },

    // Resolve configuration
    resolve: {
      alias: [
        { find: "@", replacement: resolve(__dirname, "src") },
        {
          find: "@components",
          replacement: resolve(__dirname, "src/components"),
        },
        { find: "@lib", replacement: resolve(__dirname, "src/lib") },
        { find: "@hooks", replacement: resolve(__dirname, "src/hooks") },
        { find: "@types", replacement: resolve(__dirname, "src/types") },
        { find: "@contexts", replacement: resolve(__dirname, "src/contexts") },
        { find: "@utils", replacement: resolve(__dirname, "src/utils") },
        { find: "@pages", replacement: resolve(__dirname, "src/pages") },
        { find: "@assets", replacement: resolve(__dirname, "src/assets") },
        { find: "@features", replacement: resolve(__dirname, "src/features") },
        {
          find: "@providers",
          replacement: resolve(__dirname, "src/providers"),
        },
        { find: "@store", replacement: resolve(__dirname, "src/store") },
        { find: "@styles", replacement: resolve(__dirname, "src/styles") },
        { find: "@theme", replacement: resolve(__dirname, "src/theme") },
      ],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    },

    // Development server configuration
    server: {
      port: 5173,
      strictPort: true,
      open: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },

    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
    },

    // CSS configuration
    css: {
      devSourcemap: true,
      modules: {
        localsConvention: "camelCaseOnly",
      },
    },

    // Environment variables
    define: {
      "process.env": {},
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },

    // Resolver configuration
    resolve: {
      alias: [
        { find: "@", replacement: resolve(__dirname, "src") },
        {
          find: "@components",
          replacement: resolve(__dirname, "src/components"),
        },
        { find: "@services", replacement: resolve(__dirname, "src/services") },
        {
          find: "@templates",
          replacement: resolve(__dirname, "src/templates"),
        },
        { find: "@contexts", replacement: resolve(__dirname, "src/contexts") },
        { find: "@hooks", replacement: resolve(__dirname, "src/hooks") },
        { find: "@utils", replacement: resolve(__dirname, "src/utils") },
        { find: "@assets", replacement: resolve(__dirname, "src/assets") },
      ],
    },

    // Server configuration
    server: {
      port: 5174,
      strictPort: true,
      host: true,
      open: true,
      cors: true,
    },

    // Build configuration
    build: {
      outDir: "dist",
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
      },
    },
  };
});
