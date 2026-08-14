// scripts/analyze-imports.ts
import fs from "fs/promises";
import path from "path";
import ts from "typescript";
import { glob } from "glob";

// Configuration
const PROJECT_ROOT = path.join(__dirname, "..");
const TSCONFIG_PATH = path.join(PROJECT_ROOT, "tsconfig.json");
const ENTRY_POINTS = ["src/main.tsx", "src/App.tsx", "src/AppWrapper.tsx"];

const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/public/**",
  "**/cypress/**",
  "**/__tests__/**",
  "**/__mocks__/**",
  "**/*.d.ts",
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/*.stories.tsx",
  "**/test-utils.tsx",
  "**/setupTests.ts",
];

// Track files and their imports
const fileImports = new Map<string, Set<string>>();
const fileExportSymbols = new Map<string, Set<string>>();
const fileReferences = new Map<string, Set<string>>();
const fileDependents = new Map<string, Set<string>>();
const potentialUnusedFiles = new Set<string>();
const falsePositives = new Set<string>([
  "jest.config.js",
  "postcss.config.js",
  "tailwind.config.js",
  "vite.config.ts",
  "src/App.tsx",
  "src/main.tsx",
  "src/AppWrapper.tsx",
  "src/theme.ts",
  "src/theme/theme.ts",
  "src/theme/ThemeProvider.tsx",
  "src/contexts/ThemeContext.tsx",
  "src/contexts/WebSocketContext.tsx",
  "src/store/store.ts",
  "src/store/rootReducer.ts",
]);

// Parse tsconfig.json
const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(TSCONFIG_PATH),
).options;

// Create TypeScript program
const program = ts.createProgram({
  rootNames: [path.join(PROJECT_ROOT, "src/main.tsx")],
  options: compilerOptions,
});

const typeChecker = program.getTypeChecker();

// Helper to check if a file should be ignored
function shouldIgnoreFile(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return IGNORE_PATTERNS.some((pattern) => {
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*") +
        "$",
    );
    return regex.test(relativePath);
  });
}

// Track symbol usage across files
async function analyzeFile(filePath: string): Promise<void> {
  if (shouldIgnoreFile(filePath)) return;

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return;

  const fileDeps = new Set<string>();
  const exports = new Set<string>();

  // Collect exports
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const modulePath = resolveModulePath(
          node.moduleSpecifier.text,
          filePath,
        );
        if (modulePath) fileDeps.add(modulePath);
      }
    } else if (ts.isExportAssignment(node)) {
      exports.add("default");
    } else if (ts.isClassDeclaration(node) && node.name) {
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.add(node.name.text);
      }
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.add(node.name.text);
      }
    } else if (ts.isVariableStatement(node)) {
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            exports.add(decl.name.text);
          }
        });
      }
    }
  });

  // Collect imports and track references
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.name) {
        // Default import
        trackSymbolUsage(node.importClause.name, filePath);
      }

      if (node.importClause?.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          // Named imports
          node.importClause.namedBindings.elements.forEach((element) => {
            trackSymbolUsage(element.name, filePath);
          });
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          // Namespace import
          trackSymbolUsage(node.importClause.namedBindings.name, filePath);
        }
      }

      // Track the module import
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const modulePath = resolveModulePath(
          node.moduleSpecifier.text,
          filePath,
        );
        if (modulePath) {
          fileDeps.add(modulePath);
          if (!fileReferences.has(modulePath)) {
            fileReferences.set(modulePath, new Set());
          }
          fileReferences.get(modulePath)?.add(filePath);
        }
      }
    }
  });

  fileImports.set(filePath, fileDeps);
  fileExportSymbols.set(filePath, exports);
}

// Resolve module path
function resolveModulePath(
  moduleSpecifier: string,
  containingFile: string,
): string | null {
  if (!moduleSpecifier.startsWith(".")) {
    // Handle path aliases and node_modules
    try {
      const resolved = ts.resolveModuleName(
        moduleSpecifier,
        containingFile,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      return resolved ? path.normalize(resolved) : null;
    } catch (e) {
      return null;
    }
  }

  // Handle relative paths
  const basePath = path.dirname(containingFile);
  const possibleExtensions = ["", ".ts", ".tsx", ".js", ".jsx"];
  const possiblePaths = [
    path.join(basePath, moduleSpecifier),
    path.join(basePath, moduleSpecifier, "index"),
  ];

  for (const base of possiblePaths) {
    for (const ext of possibleExtensions) {
      const fullPath = `${base}${ext}`;
      if (fs.existsSync(fullPath)) {
        return path.normalize(fullPath);
      }
    }
  }

  return null;
}

// Track symbol usage
function trackSymbolUsage(identifier: ts.Identifier, filePath: string): void {
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations) {
      declarations.forEach((decl) => {
        const sourceFile = decl.getSourceFile();
        if (sourceFile) {
          const declPath = sourceFile.fileName;
          if (!fileDependents.has(declPath)) {
            fileDependents.set(declPath, new Set());
          }
          fileDependents.get(declPath)?.add(filePath);
        }
      });
    }
  }
}

// Main analysis function
async function analyzeCodebase(): Promise<void> {
  console.log("🔍 Starting codebase analysis...\n");

  // Get all TypeScript/JavaScript files
  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: PROJECT_ROOT,
    ignore: IGNORE_PATTERNS,
    absolute: true,
    nodir: true,
  });

  console.log(`📂 Found ${files.length} files to analyze\n`);

  // Analyze each file
  for (const file of files) {
    try {
      await analyzeFile(file);
      process.stdout.write(".");
    } catch (error) {
      console.error(`\nError analyzing ${file}:`, error);
    }
  }

  // Identify potentially unused files
  for (const file of files) {
    if (
      !fileReferences.has(file) &&
      !fileDependents.has(file) &&
      !ENTRY_POINTS.some((ep) => file.endsWith(ep)) &&
      !falsePositives.has(path.relative(PROJECT_ROOT, file))
    ) {
      potentialUnusedFiles.add(file);
    }
  }

  // Generate report
  console.log("\n\n📊 Analysis Results:");
  console.log("===================\n");

  console.log(`📂 Total files analyzed: ${files.length}`);
  console.log(`🔗 Total unique imports: ${fileReferences.size}`);
  console.log(`📦 Total exports found: ${fileExportSymbols.size}`);
  console.log(`❓ Potentially unused files: ${potentialUnusedFiles.size}\n`);

  // Show potentially unused files
  if (potentialUnusedFiles.size > 0) {
    console.log("🔍 Potentially Unused Files:");
    console.log("---------------------------");
    Array.from(potentialUnusedFiles)
      .sort()
      .forEach((file) => {
        const relativePath = path.relative(PROJECT_ROOT, file);
        console.log(`- ${relativePath}`);
      });
    console.log(
      "\n💡 Note: Some files might be false positives. Please review before deleting.\n",
    );
  } else {
    console.log("✅ No potentially unused files found!\n");
  }

  // Show files with many dependents (important files)
  const filesByDependents = Array.from(fileDependents.entries())
    .filter(([file]) => !shouldIgnoreFile(file))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);

  if (filesByDependents.length > 0) {
    console.log("🏆 Most Imported Files:");
    console.log("----------------------");
    filesByDependents.forEach(([file, dependents]) => {
      const relativePath = path.relative(PROJECT_ROOT, file);
      console.log(`- ${relativePath} (${dependents.size} dependents)`);
    });
    console.log("");
  }
}

// Run the analysis
analyzeCodebase().catch(console.error);
