import * as fs from "fs";
import * as path from "path";
import { execSync, spawnSync } from "child_process";
import { glob } from "glob";
import { promisify } from "util";

const readFile = promisify(fs.readFile);

type Issue = {
  file: string;
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning" | "info";
};

class FrontendAuditor {
  private issues: Issue[] = [];
  private readonly rootDir: string;
  private readonly srcDir: string;

  constructor() {
    this.rootDir = path.resolve(process.cwd());
    this.srcDir = path.join(this.rootDir, "src");
  }

  async run() {
    console.log("🔍 Starting comprehensive code audit...\n");

    // Run all checks in parallel for better performance
    await Promise.all([
      this.checkDependencies(),
      this.checkTypeScriptIssues(),
      this.checkForDeprecatedImports(),
      this.checkForUnusedImports(),
      this.checkForTypeErrors(),
      this.checkForUnusedVariables(),
      this.checkForConsoleLogs(),
      this.checkForMissingDependencies(),
    ]);

    this.reportIssues();
  }

  private async checkDependencies() {
    console.log("🔧 Checking dependencies...");

    try {
      // Check for outdated packages
      console.log("  - Checking for outdated packages...");
      execSync("npm outdated --json", { stdio: "pipe" });
    } catch (error: any) {
      const outdated = JSON.parse(error.stdout.toString());
      for (const [pkg, info] of Object.entries(outdated)) {
        this.issues.push({
          file: "package.json",
          message: `Outdated package: ${pkg} (current: ${
            (info as any).current
          }, wanted: ${(info as any).wanted}, latest: ${(info as any).latest})`,
          severity: "warning",
        });
      }
    }
  }

  private async checkTypeScriptIssues() {
    console.log("📝 Checking TypeScript issues...");

    try {
      // Run TypeScript compiler to find type errors
      const result = execSync("npx tsc --noEmit --pretty false", {
        stdio: "pipe",
      });
      const output = result.toString();

      // Parse TypeScript errors
      const errorRegex = /(.*)\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)/g;
      let match;

      while ((match = errorRegex.exec(output)) !== null) {
        const [, file, line, column, type, code, message] = match;
        this.issues.push({
          file: path.relative(this.rootDir, file.trim()),
          message: `[${code}] ${message}`,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          severity: type === "error" ? "error" : "warning",
        });
      }
    } catch (error: any) {
      // TypeScript errors are captured above, this is just to handle the non-zero exit code
    }
  }

  private async checkForDeprecatedImports() {
    console.log("🔎 Checking for deprecated imports...");

    // Common deprecated patterns and their replacements
    const deprecatedImports = {
      // xterm.js
      "xterm-addon-webgl": "@xterm/addon-webgl",
      "xterm-addon-unicode11": "@xterm/addon-unicode11",
      "xterm-addon-serialize": "@xterm/addon-serialize",
      "xterm-addon-": "@xterm/addon-",
      "xterm/": "@xterm/",

      // React 17 to 18 changes
      "React.FC<": "React.FC<",
      "import React from [\"']react[\"']": 'import * as React from "react"',

      // Common deprecated packages
      enzyme: "@testing-library/react",
      "react-test-renderer": "@testing-library/react",
      "create-react-class": "class components or functions with hooks",
      "prop-types": "TypeScript interfaces/types",

      // Deprecated lifecycle methods
      componentWillMount: "useEffect",
      componentWillReceiveProps: "getDerivedStateFromProps or useEffect",
      componentWillUpdate: "getSnapshotBeforeUpdate or useEffect",
    };

    const files = await glob("**/*.{ts,tsx,js,jsx}", {
      cwd: this.srcDir,
      ignore: ["**/node_modules/**", "**/*.d.ts"],
    });

    for (const file of files) {
      const filePath = path.join(this.srcDir, file);
      const content = await fs.promises.readFile(filePath, "utf-8");

      for (const [deprecated, replacement] of Object.entries(
        deprecatedImports,
      )) {
        if (
          content.includes(`from "${deprecated}"`) ||
          content.includes(`from '${deprecated}'`)
        ) {
          this.issues.push({
            file,
            message: `Deprecated import: "${deprecated}" should be replaced with "${replacement}"`,
            severity: "warning",
          });
        }
      }
    }
  }

  private async checkForTypeErrors() {
    console.log("🔍 Checking for TypeScript type errors...");

    try {
      const result = spawnSync(
        "npx",
        ["tsc", "--noEmit", "--pretty", "false"],
        {
          cwd: this.rootDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      if (result.status !== 0) {
        const output = result.stderr || result.stdout;
        const errorRegex =
          /([^\s].*?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)/g;
        let match;

        while ((match = errorRegex.exec(output)) !== null) {
          const [, file, line, column, type, code, message] = match;
          this.issues.push({
            file: path.relative(this.rootDir, file.trim()),
            message: `[${code}] ${message}`,
            line: parseInt(line, 10),
            column: parseInt(column, 10),
            severity: type === "error" ? "error" : "warning",
          });
        }
      }
    } catch (error) {
      console.error("Error checking TypeScript errors:", error);
    }
  }

  private async checkForUnusedImports() {
    console.log("🔍 Checking for unused imports and variables...");

    try {
      // First, find all TypeScript and JavaScript files
      const files = await glob("**/*.{ts,tsx,js,jsx}", {
        cwd: this.rootDir,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/out/**",
          "**/*.d.ts",
          "**/*.test.*",
          "**/*.spec.*",
          "**/__tests__/**",
          "**/__mocks__/**",
          "**/coverage/**",
        ],
      });

      // Use ESLint to find unused imports and variables
      for (const file of files) {
        try {
          const result = spawnSync(
            "npx",
            [
              "eslint",
              "--no-eslintrc",
              "--no-inline-config",
              "--rule",
              'no-unused-vars: ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }]',
              "--format",
              "json",
              file,
            ],
            {
              cwd: this.rootDir,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            },
          );

          if (result.status === 0) continue;

          const output = JSON.parse(result.stdout || "[]");

          for (const fileReport of output) {
            for (const message of fileReport.messages) {
              if (
                message.ruleId === "no-unused-vars" &&
                (message.message.includes("is defined but never used") ||
                  message.message.includes(
                    "is assigned a value but never used",
                  ))
              ) {
                this.issues.push({
                  file: path.relative(this.rootDir, fileReport.filePath),
                  message: message.message,
                  line: message.line,
                  column: message.column,
                  severity: "warning",
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error checking file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking for unused imports:", error);
    }
  }

  private async checkForConsoleLogs() {
    console.log("🔍 Checking for console.log statements...");

    try {
      const files = await glob("**/*.{ts,tsx,js,jsx}", {
        cwd: this.rootDir,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/out/**",
          "**/*.d.ts",
          "**/*.test.*",
          "**/*.spec.*",
          "**/__tests__/**",
          "**/__mocks__/**",
        ],
      });

      for (const file of files) {
        try {
          const content = await readFile(
            path.join(this.rootDir, file),
            "utf-8",
          );
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            if (
              line.includes("console.log(") ||
              line.includes("console.error(") ||
              line.includes("console.warn(") ||
              line.includes("console.info(")
            ) {
              this.issues.push({
                file,
                message:
                  "Found console statement. Consider removing or using a proper logging library in production.",
                line: index + 1,
                severity: "warning",
              });
            }
          });
        } catch (error) {
          console.error(`Error checking file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking for console logs:", error);
    }
  }

  private async checkForMissingDependencies() {
    console.log("🔍 Checking for missing dependencies...");

    try {
      const result = spawnSync("npm", ["ls", "--json"], {
        cwd: this.rootDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (result.status !== 0) {
        const output = JSON.parse(result.stdout || "{}");
        if (output.problems) {
          output.problems.forEach((problem: string) => {
            this.issues.push({
              file: "package.json",
              message: problem,
              severity: "error",
            });
          });
        }
      }
    } catch (error) {
      console.error("Error checking for missing dependencies:", error);
    }
  }

  private async checkForUnusedVariables() {
    console.log("🔍 Checking for unused variables...");

    try {
      const files = await glob("**/*.{ts,tsx,js,jsx}", {
        cwd: this.rootDir,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/out/**",
          "**/*.d.ts",
          "**/*.test.*",
          "**/*.spec.*",
          "**/__tests__/**",
          "**/__mocks__/**",
        ],
      });

      for (const file of files) {
        try {
          const result = spawnSync(
            "npx",
            [
              "eslint",
              "--no-eslintrc",
              "--no-inline-config",
              "--rule",
              'no-unused-vars: ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }]',
              "--format",
              "json",
              file,
            ],
            {
              cwd: this.rootDir,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            },
          );

          if (result.status === 0) continue;

          const output = JSON.parse(result.stdout || "[]");

          for (const fileReport of output) {
            for (const message of fileReport.messages) {
              if (
                message.ruleId === "no-unused-vars" &&
                (message.message.includes("is defined but never used") ||
                  message.message.includes(
                    "is assigned a value but never used",
                  ))
              ) {
                this.issues.push({
                  file: path.relative(this.rootDir, fileReport.filePath),
                  message: message.message,
                  line: message.line,
                  column: message.column,
                  severity: "warning",
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error checking file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking for unused variables:", error);
    }
  }

  private reportIssues() {
    console.log("\n📋 Audit Report\n");

    const errors = this.issues.filter((i) => i.severity === "error");
    const warnings = this.issues.filter((i) => i.severity === "warning");
    const infos = this.issues.filter((i) => i.severity === "info");

    // Group issues by file
    const filesWithIssues = new Map<
      string,
      { errors: Issue[]; warnings: Issue[]; infos: Issue[] }
    >();

    this.issues.forEach((issue) => {
      if (!filesWithIssues.has(issue.file)) {
        filesWithIssues.set(issue.file, {
          errors: [],
          warnings: [],
          infos: [],
        });
      }
      const file = filesWithIssues.get(issue.file)!;
      if (issue.severity === "error") file.errors.push(issue);
      else if (issue.severity === "warning") file.warnings.push(issue);
      else file.infos.push(issue);
    });

    // Print summary by file
    console.log("📁 Files with issues:");
    filesWithIssues.forEach((issues, file) => {
      const errorCount = issues.errors.length;
      const warningCount = issues.warnings.length;
      const infoCount = issues.infos.length;

      const issueCounts = [
        errorCount > 0
          ? `❌ ${errorCount} error${errorCount > 1 ? "s" : ""}`
          : "",
        warningCount > 0
          ? `⚠️  ${warningCount} warning${warningCount > 1 ? "s" : ""}`
          : "",
        infoCount > 0 ? `ℹ️  ${infoCount} info` : "",
      ]
        .filter(Boolean)
        .join(", ");

      console.log(`\n${file} (${issueCounts}):`);

      // Print error details for the file
      if (issues.errors.length > 0) {
        console.log("  ❌ Errors:");
        issues.errors.forEach((issue) => {
          console.log(
            `    - ${issue.message}${
              issue.line
                ? ` (line ${issue.line}${
                    issue.column ? `:${issue.column}` : ""
                  })`
                : ""
            }`,
          );
        });
      }

      // Print warning details for the file
      if (issues.warnings.length > 0) {
        console.log("  ⚠️  Warnings:");
        issues.warnings.forEach((issue) => {
          console.log(
            `    - ${issue.message}${
              issue.line
                ? ` (line ${issue.line}${
                    issue.column ? `:${issue.column}` : ""
                  })`
                : ""
            }`,
          );
        });
      }

      // Print info details for the file
      if (issues.infos.length > 0) {
        console.log("  ℹ️  Info:");
        issues.infos.forEach((issue) => {
          console.log(
            `    - ${issue.message}${
              issue.line
                ? ` (line ${issue.line}${
                    issue.column ? `:${issue.column}` : ""
                  })`
                : ""
            }`,
          );
        });
      }
    });

    // Print summary
    console.log(`\n📊 Summary:`);
    console.log(`  - ${filesWithIssues.size} files with issues`);
    console.log(`  - ${errors.length} total errors`);
    console.log(`  - ${warnings.length} total warnings`);
    console.log(`  - ${infos.length} total info messages`);

    if (errors.length > 0) {
      console.log("\n❌ Found errors that need to be fixed.");
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log(
        "\n⚠️  No errors found, but there are warnings that should be reviewed.",
      );
    } else {
      console.log("\n✅ No issues found!");
    }
  }

  private printIssues(issues: Issue[]) {
    const grouped = issues.reduce(
      (acc, issue) => {
        if (!acc[issue.file]) {
          acc[issue.file] = [];
        }
        acc[issue.file].push(issue);
        return acc;
      },
      {} as Record<string, Issue[]>,
    );

    for (const [file, fileIssues] of Object.entries(grouped)) {
      console.log(`\n${file}:`);
      for (const issue of fileIssues) {
        const location = issue.line
          ? `:${issue.line}${issue.column ? `:${issue.column}` : ""}`
          : "";
        console.log(
          `  ${
            issue.severity === "error"
              ? "❌"
              : issue.severity === "warning"
                ? "⚠️"
                : "ℹ️"
          } ${issue.message}${location}`,
        );
      }
    }
  }
}

// Run the auditor
new FrontendAuditor().run().catch(console.error);
