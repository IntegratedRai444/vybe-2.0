#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

// Types for our issue tracking
interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

class IssueReporter {
  private issues: Issue[] = [];
  private rootDir: string;
  private hasTypeScript = false;
  private hasESLint = false;
  private hasJest = false;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.checkDependencies();
  }

  private checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8'));
      this.hasTypeScript = !!packageJson.dependencies?.typescript || !!packageJson.devDependencies?.typescript;
      this.hasESLint = !!packageJson.dependencies?.eslint || !!packageJson.devDependencies?.eslint;
      this.hasJest = !!packageJson.dependencies?.jest || !!packageJson.devDependencies?.jest;
    } catch (error) {
      this.addIssue('error', `Error reading package.json: ${error.message}`);
    }
  }

  addIssue(type: Issue['type'], message: string, file?: string, line?: number, column?: number) {
    this.issues.push({ type, message, file, line, column });
  }

  async runTypeScriptCheck() {
    if (!this.hasTypeScript) {
      this.addIssue('warning', 'TypeScript is not installed. Skipping TypeScript checks.');
      return;
    }

    try {
      const cmd = 'npx tsc --noEmit --pretty';
      const output = execSync(cmd, { cwd: this.rootDir, encoding: 'utf-8' });
      
      // Parse TypeScript errors
      const errorRegex = /(\S+\.tsx?)\((\d+),(\d+)\): error (TS\d+): (.+)/g;
      let match;
      
      while ((match = errorRegex.exec(output)) !== null) {
        const [_, file, line, column, code, message] = match;
        this.addIssue('error', `[${code}] ${message}`, file, parseInt(line), parseInt(column));
      }
    } catch (error) {
      // tsc exits with non-zero code when there are type errors, which we expect
      if (error.status !== 0) {
        // Errors are already captured from stdout
        return;
      }
      this.addIssue('error', `TypeScript check failed: ${error.message}`);
    }
  }

  async runESLint() {
    if (!this.hasESLint) {
      this.addIssue('info', 'ESLint is not installed. Skipping linting.');
      return;
    }

    try {
      const cmd = 'npx eslint . --format json --ext .ts,.tsx,.js,.jsx';
      const output = execSync(cmd, { cwd: this.rootDir, encoding: 'utf-8' });
      const results = JSON.parse(output);
      
      results.forEach((file: any) => {
        file.messages.forEach((msg: any) => {
          this.addIssue(
            msg.severity === 2 ? 'error' : 'warning',
            `[${msg.ruleId || 'eslint'}] ${msg.message}`,
            file.filePath,
            msg.line,
            msg.column
          );
        });
      });
    } catch (error) {
      if (error.status !== 1) { // ESLint exits with 1 when there are issues
        this.addIssue('error', `ESLint check failed: ${error.message}`);
      }
    }
  }

  async runDependencyCheck() {
    try {
      const cmd = 'npm outdated --json';
      const output = execSync(cmd, { cwd: this.rootDir, encoding: 'utf-8' });
      const outdated = JSON.parse(output);
      
      Object.entries(outdated).forEach(([pkg, info]: [string, any]) => {
        this.addIssue(
          'warning',
          `Package ${pkg} is outdated. Current: ${info.current}, Wanted: ${info.wanted}, Latest: ${info.latest}`
        );
      });
    } catch (error) {
      // npm outdated exits with non-zero when there are outdated packages
      if (error.status !== 1) {
        this.addIssue('error', `Dependency check failed: ${error.message}`);
      }
    }
  }

  async checkForMissingImports() {
    try {
      const srcDir = path.join(this.rootDir, 'src');
      const files = this.getFilesRecursively(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const importRegex = /from\s+['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (importPath.startsWith('.')) {
            const absolutePath = this.resolveImportPath(file, importPath);
            if (!fs.existsSync(absolutePath) && !fs.existsSync(`${absolutePath}.ts`) && 
                !fs.existsSync(`${absolutePath}.tsx`) && !fs.existsSync(`${absolutePath}.js`) && 
                !fs.existsSync(`${absolutePath}.jsx`)) {
              this.addIssue('error', `Import path not found: ${importPath}`, file, this.getLineNumber(content, match.index));
            }
          }
        }
      });
    } catch (error) {
      this.addIssue('error', `Error checking for missing imports: ${error.message}`);
    }
  }

  private getFilesRecursively(dir: string, extensions: string[]): string[] {
    let results: string[] = [];
    
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getFilesRecursively(file, extensions));
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        results.push(file);
      }
    });
    
    return results;
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    const dir = path.dirname(fromFile);
    
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fullPath = path.resolve(dir, importPath);
      
      // Check for file extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      for (const ext of extensions) {
        if (fs.existsSync(`${fullPath}${ext}`)) {
          return `${fullPath}${ext}`;
        }
      }
      
      return fullPath;
    }
    
    return importPath;
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  async runAllChecks() {
    console.log(chalk.blue('\n🚀 Running project diagnostics...\n'));
    
    await this.runTypeScriptCheck();
    await this.runESLint();
    await this.runDependencyCheck();
    await this.checkForMissingImports();
    
    this.report();
  }

  private report() {
    const errorCount = this.issues.filter(i => i.type === 'error').length;
    const warningCount = this.issues.filter(i => i.type === 'warning').length;
    const infoCount = this.issues.filter(i => i.type === 'info').length;
    
    console.log(chalk.bold('\n📋 Diagnostic Results:\n'));
    
    // Group issues by file
    const issuesByFile: Record<string, Issue[]> = {};
    this.issues.forEach(issue => {
      const file = issue.file || 'General';
      if (!issuesByFile[file]) {
        issuesByFile[file] = [];
      }
      issuesByFile[file].push(issue);
    });
    
    // Print issues by file
    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(chalk.underline(`\n${file}`));
      
      issues.forEach(issue => {
        const color = issue.type === 'error' ? 'red' : issue.type === 'warning' ? 'yellow' : 'blue';
        const prefix = issue.type.toUpperCase().padEnd(8);
        const location = issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : '';
        
        console.log(
          chalk[color](`  ${prefix}`) + 
          chalk.gray(`${file}${location}`) + 
          ' - ' + 
          issue.message
        );
      });
    });
    
    // Print summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.red(`  Errors: ${errorCount}`));
    console.log(chalk.yellow(`  Warnings: ${warningCount}`));
    console.log(chalk.blue(`  Info: ${infoCount}`));
    
    if (errorCount > 0) {
      console.log(chalk.red.bold('\n❌ Issues found that need attention!'));
      process.exit(1);
    } else if (warningCount > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Some warnings to review.'));
    } else {
      console.log(chalk.green.bold('\n✅ No critical issues found!'));
    }
  }
}

// Run the diagnostics
const rootDir = process.cwd();
const reporter = new IssueReporter(rootDir);
reporter.runAllChecks();
