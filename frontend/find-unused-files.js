import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { transformSync } from "@babel/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, "..");
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".vercel",
  ".github",
  "__tests__",
  "__mocks__",
  "coverage",
  "public",
  "scripts",
  "types",
  ".vscode",
  ".idea",
  "cypress",
  "mocks",
  "stories",
  "test",
  "test-utils",
];

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const ALIASES = {
  "@": path.join(PROJECT_ROOT, "src"),
  "~": path.join(PROJECT_ROOT, "src"),
};

// Cache for parsed files
const fileCache = new Map();

// Resolve path with aliases
function resolvePath(importPath, currentFile) {
  // Skip node modules and absolute paths
  if (importPath.startsWith(".") || importPath.startsWith("..")) {
    return path.resolve(path.dirname(currentFile), importPath);
  }

  // Handle path aliases
  const [alias] = Object.keys(ALIASES).filter((a) => importPath.startsWith(a));
  if (alias) {
    return path.join(ALIASES[alias], importPath.replace(alias, ""));
  }

  return importPath;
}

// Get all TypeScript/JavaScript files
function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  const relativeDir = path.relative(PROJECT_ROOT, dir);

  // Skip ignored directories
  if (IGNORE_DIRS.some((ignoreDir) => relativeDir.includes(ignoreDir))) {
    return fileList;
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    if (IGNORE_DIRS.some((ignoreDir) => relativePath.includes(ignoreDir))) {
      return;
    }

    if (stat.isDirectory()) {
      getAllSourceFiles(filePath, fileList);
    } else if (EXTENSIONS.some((ext) => file.endsWith(ext))) {
      fileList.push(relativePath);
    }
  });

  return fileList;
}

// Get all import statements from a file using Babel
function getImports(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);

  // Check cache first
  if (fileCache.has(fullPath)) {
    return fileCache.get(fullPath);
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");

    // Skip empty files or files that can't be parsed
    if (!content.trim()) {
      fileCache.set(fullPath, []);
      return [];
    }

    const ast = parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
    });

    const imports = new Set();
    const dynamicImports = new Set();

    // Handle static imports and requires
    traverse(ast, {
      ImportDeclaration(path) {
        imports.add(path.node.source.value);
      },
      CallExpression(path) {
        if (path.node.callee.type === "Import") {
          if (path.node.arguments[0]?.type === "StringLiteral") {
            dynamicImports.add(path.node.arguments[0].value);
          }
        } else if (
          path.node.callee.type === "Identifier" &&
          path.node.callee.name === "require" &&
          path.node.arguments[0]?.type === "StringLiteral"
        ) {
          imports.add(path.node.arguments[0].value);
        }
      },
    });

    // Handle dynamic imports in JSX
    const jsxContent =
      transformSync(content, {
        plugins: ["@babel/plugin-syntax-jsx"],
        presets: ["@babel/preset-react"],
      })?.code || "";

    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = dynamicImportRegex.exec(jsxContent)) !== null) {
      dynamicImports.add(match[1]);
    }

    const allImports = [...imports, ...dynamicImports]
      .filter((imp) => !imp.startsWith("http"))
      .filter((imp) => !imp.startsWith("data:"))
      .filter((imp) => !imp.startsWith("file:"))
      .map((imp) => resolvePath(imp, filePath));

    fileCache.set(fullPath, allImports);
    return allImports;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    fileCache.set(fullPath, []);
    return [];
  }
}

// Main function
async function findUnusedFiles() {
  console.log("🔍 Scanning for unused files...\n");

  try {
    // Install required dependencies if not present
    try {
      require.resolve("@babel/parser");
    } catch (e) {
      console.log("Installing required dependencies...");
      execSync(
        "npm install --save-dev @babel/parser @babel/traverse @babel/core @babel/preset-react @babel/plugin-syntax-jsx",
        {
          cwd: PROJECT_ROOT,
          stdio: "inherit",
        },
      );
    }

    const { parse } = await import("@babel/parser");
    const traverse = (await import("@babel/traverse")).default;
    const { transformSync } = await import("@babel/core");

    const allFiles = [];
    getAllSourceFiles(PROJECT_ROOT, allFiles);

    const fileUsage = new Map();
    const fileDependencies = new Map();

    // Initialize all files
    allFiles.forEach((file) => {
      fileUsage.set(file, {
        used: false,
        usedBy: [],
        isEntry: [
          "src/main.tsx",
          "src/App.tsx",
          "src/index.tsx",
          "src/AppWrapper.tsx",
        ].includes(file),
      });
    });

    // First pass: build dependency graph
    for (const file of allFiles) {
      const imports = getImports(file);
      fileDependencies.set(file, imports);
    }

    // Second pass: resolve dependencies
    function markAsUsed(file, usedBy = null) {
      if (!fileUsage.has(file)) return;

      const fileInfo = fileUsage.get(file);
      if (fileInfo.used && !usedBy) return; // Already processed

      fileInfo.used = true;
      if (usedBy) {
        fileInfo.usedBy.push(usedBy);
      }

      // Mark all files this file imports as used
      const imports = fileDependencies.get(file) || [];
      imports.forEach((imp) => {
        // Try to find the actual file path
        const possibleFiles = [
          imp,
          `${imp}.ts`,
          `${imp}.tsx`,
          `${imp}.js`,
          `${imp}.jsx`,
          path.join(imp, "index.ts"),
          path.join(imp, "index.tsx"),
          path.join(imp, "index.js"),
          path.join(imp, "index.jsx"),
        ];

        for (const possibleFile of possibleFiles) {
          if (fileUsage.has(possibleFile)) {
            markAsUsed(possibleFile, file);
            break;
          }
        }
      });
    }

    // Start with entry points
    for (const [file, info] of fileUsage) {
      if (info.isEntry) {
        markAsUsed(file);
      }
    }

    // Mark all files in public directory as used
    allFiles.forEach((file) => {
      if (file.startsWith("public/") || file.includes("/public/")) {
        fileUsage.get(file).used = true;
      }
    });

    // Get unused files
    const unusedFiles = [];
    const usedFiles = [];

    fileUsage.forEach((value, key) => {
      if (value.used) {
        usedFiles.push(key);
      } else {
        unusedFiles.push(key);
      }
    });

    console.log(`✅ Used files (${usedFiles.length}):`);
    usedFiles.sort().forEach((file) => {
      console.log(`- ${file}`);
    });

    console.log("\n🚫 Potentially unused files:");
    unusedFiles.sort().forEach((file) => {
      console.log(`- ${file}`);
    });

    console.log(
      `\n📊 Found ${unusedFiles.length} potentially unused files out of ${allFiles.length} total files.`,
    );

    // Save results to a file
    fs.writeFileSync(
      path.join(PROJECT_ROOT, "unused-files-report.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          totalFiles: allFiles.length,
          usedFiles: usedFiles.length,
          unusedFiles: unusedFiles.length,
          unusedFilesList: unusedFiles,
          fileUsage: Object.fromEntries(fileUsage),
        },
        null,
        2,
      ),
    );

    console.log("\n📝 Report saved to unused-files-report.json");
  } catch (error) {
    console.error("Error analyzing files:", error);
    process.exit(1);
  }
}

// Run the script
findUnusedFiles();
