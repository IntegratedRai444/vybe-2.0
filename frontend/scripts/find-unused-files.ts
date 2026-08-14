// scripts/analyze-imports.ts
import fs from "fs";
import path from "path";
import { glob } from "glob";

const rootDir = path.join(process.cwd(), "src");
const allFiles = glob.sync("**/*.{ts,tsx,js,jsx,json}", {
  cwd: rootDir,
  ignore: ["**/node_modules/**", "**/*.d.ts", "**/dist/**", "**/build/**"],
});

console.log(`Found ${allFiles.length} files to analyze...`);

const importsMap = new Map();
const fileContentMap = new Map();

// First pass: Read all file contents
allFiles.forEach((file) => {
  const fullPath = path.join(rootDir, file);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    fileContentMap.set(file, content);
    importsMap.set(file, new Set());
  } catch (error) {
    console.warn(`⚠️  Could not read ${file}:`, error.message);
  }
});

// Second pass: Find imports
fileContentMap.forEach((content, file) => {
  // Find all import/require statements
  const importRegex = /(?:import|require)\(?['"]([^'"]+)['"]\)?/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith(".")) {
      // Resolve relative imports
      const dir = path.dirname(file);
      const resolvedPath = path.resolve(rootDir, dir, importPath);
      const normalizedPath = path
        .relative(rootDir, resolvedPath)
        .replace(/\\/g, "/");

      // Add .ts/.tsx extension if missing
      const possiblePaths = [
        normalizedPath,
        `${normalizedPath}.ts`,
        `${normalizedPath}.tsx`,
        `${normalizedPath}/index.ts`,
        `${normalizedPath}/index.tsx`,
      ];

      for (const possiblePath of possiblePaths) {
        if (fileContentMap.has(possiblePath)) {
          importsMap.get(possiblePath)?.add(file);
          break;
        }
      }
    }
  }
});

// Generate report
const report = {
  generatedAt: new Date().toISOString(),
  stats: {
    totalFiles: allFiles.length,
    usedFiles: 0,
    unusedFiles: 0,
    entryPoints: [] as string[],
  },
  unusedFiles: [] as string[],
  usedFiles: [] as { file: string; importedBy: string[] }[],
  entryPoints: [] as string[],
};

// Check for entry points
["App.tsx", "main.tsx", "index.tsx", "index.ts"].forEach((entry) => {
  if (fileContentMap.has(entry)) {
    report.entryPoints.push(entry);
    markAsUsed(entry, "entry point");
  }
});

// Mark files as used
function markAsUsed(file: string, reason: string) {
  if (!importsMap.has(file)) return;

  const importedBy = importsMap.get(file);
  if (importedBy) {
    report.usedFiles.push({
      file,
      importedBy: Array.from(importedBy),
    });
    importedBy.forEach((importer) =>
      markAsUsed(importer, `imported by ${file}`),
    );
  }
}

// Generate final report
fileContentMap.forEach((_, file) => {
  if (report.usedFiles.some((f) => f.file === file)) {
    report.stats.usedFiles++;
  } else {
    report.stats.unusedFiles++;
    report.unusedFiles.push(file);
  }
});

// Save report
fs.writeFileSync(
  path.join(process.cwd(), "import-analysis.json"),
  JSON.stringify(report, null, 2),
);

// Print summary
console.log("\n📊 Import Analysis Report");
console.log("=".repeat(50));
console.log(`\n✅ Used files: ${report.stats.usedFiles}`);
console.log(`⚠️  Unused files: ${report.stats.unusedFiles}`);
console.log(`🚀 Entry points: ${report.entryPoints.join(", ")}`);

if (report.unusedFiles.length > 0) {
  console.log("\n🔴 Potentially Unused Files:");
  report.unusedFiles.slice(0, 20).forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  if (report.unusedFiles.length > 20) {
    console.log(`  ... and ${report.unusedFiles.length - 20} more`);
  }
}

console.log("\n💡 Check import-analysis.json for full details");
console.log("=".repeat(50));
