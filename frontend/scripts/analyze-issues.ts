import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

interface Issue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  rule?: string;
  category: string;
}

class IssueAnalyzer {
  private rootDir: string;
  private issues: Issue[] = [];
  private categories: Record<string, number> = {};
  private rules: Record<string, number> = {};
  private fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  async runAnalysis() {
    console.log(chalk.blue('🔍 Starting frontend code analysis...\n'));
    
    try {
      // Run TypeScript compiler to get type errors
      await this.runTypeScriptCheck();
      
      // Run ESLint to get linting issues
      await this.runESLint();
      
      // Run additional custom checks
      await this.runCustomChecks();
      
      this.analyzeResults();
      this.generateReport();
      
    } catch (error) {
      console.error(chalk.red('❌ Error during analysis:'), error);
    }
  }

  private async runTypeScriptCheck() {
    console.log(chalk.cyan('🔧 Running TypeScript type checking...'));
    
    try {
      // First check if TypeScript is installed
      const tscOutput = execSync('npx tsc --version', { 
        cwd: this.rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log(chalk.gray(`  Using TypeScript ${tscOutput.trim()}`));
      
      // Run type checking
      const checkOutput = execSync('npx tsc --noEmit --pretty false', { 
        cwd: this.rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // If we get here, there were no type errors
      console.log(chalk.green('  ✓ No TypeScript errors found'));
      
    } catch (error: any) {
      // tsc exits with code 1 when there are type errors, which we expect
      if (error.status === 1 && error.stdout) {
        console.log(chalk.yellow('  ⚠️  TypeScript found type errors:'));
        this.parseTypeScriptErrors(error.stdout);
      } else {
        console.error(chalk.yellow('⚠️  TypeScript check failed:'), error.message);
      }
    }
  }

  private parseTypeScriptErrors(output: string) {
    const lines = output.split('\n');
    let currentFile = '';

    for (const line of lines) {
      // Match file path (e.g., "src/components/App.tsx:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.")
      const fileMatch = line.match(/^(.*?):(\d+):(\d+)\s+-\s+(error|warning|suggestion)\s+(TS\d+):?\s*(.*)/);
      
      if (fileMatch) {
        const [_, file, lineNum, column, severity, rule, message] = fileMatch;
        currentFile = path.relative(this.rootDir, file);
        
        this.issues.push({
          file: currentFile,
          line: parseInt(lineNum, 10),
          column: parseInt(column, 10),
          severity: severity as 'error' | 'warning' | 'suggestion',
          message: message.trim(),
          rule,
          category: 'TypeScript'
        });
      } 
      // Handle multi-line error messages
      else if (currentFile && line.trim()) {
        const lastIssue = this.issues[this.issues.length - 1];
        if (lastIssue) {
          lastIssue.message += '\n' + line.trim();
        }
      }
    }
  }

  private async runESLint() {
    console.log(chalk.cyan('🔍 Running ESLint analysis...'));
    
    try {
      // Check ESLint version
      const eslintVersion = execSync('npx eslint --version', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      });
      
      console.log(chalk.gray(`  Using ESLint ${eslintVersion.trim()}`));
      
      // Try the new config format first, fall back to old format
      let eslintOutput;
      try {
        eslintOutput = execSync('npx eslint --config=eslint.config.js --format=json .', {
          cwd: this.rootDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error: any) {
        if (error.status === 1 && error.stdout) {
          // This is expected if there are linting errors
          eslintOutput = error.stdout;
        } else {
          // Try with .eslintrc if eslint.config.js doesn't exist
          eslintOutput = execSync('npx eslint --format=json .', {
            cwd: this.rootDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
        }
      }
      
      this.parseESLintOutput(eslintOutput);
      
    } catch (error: any) {
      if (error.status === 1 && error.stdout) {
        // This is expected if there are linting errors
        this.parseESLintOutput(error.stdout);
      } else {
        console.error(chalk.yellow('⚠️  ESLint check failed:'), error.message);
        console.log(chalk.gray('  Try running: npx eslint --init'));
      }
    }
  }

  private parseESLintOutput(output: string) {
    try {
      const results = JSON.parse(output);
      
      for (const result of results) {
        const filePath = path.relative(this.rootDir, result.filePath);
        
        for (const message of result.messages) {
          this.issues.push({
            file: filePath,
            line: message.line || 1,
            column: message.column || 1,
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            rule: message.ruleId,
            category: 'Linting'
          });
        }
      }
    } catch (error) {
      console.error(chalk.yellow('⚠️  Failed to parse ESLint output:'), error);
    }
  }

  private async runCustomChecks() {
    console.log(chalk.cyan('🔎 Running custom checks...'));
    
    // Check for unused variables
    await this.checkForUnusedVariables();
    
    // Check for console.logs in production code
    await this.checkForConsoleLogs();
  }

  private async checkForUnusedVariables() {
    // This is a simplified example - in a real scenario, you'd use a proper AST parser
    const files = this.findFiles(this.rootDir, this.fileExtensions);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);
      
      // Simple regex to find potentially unused variables
      // Note: This is a simplified example and may have false positives/negatives
      const unusedVarRegex = /const\s+(\w+)\s*=\s*[^;]+;\s*(?!\/\*[\s\S]*?\*\/|\/\/.*?\n|\/\*[\s\S]*?\*\/|\/\/.*?$|\/\*[\s\S]*?\*\/)[^\w](\1)(?![\w(])/g;
      
      let match;
      while ((match = unusedVarRegex.exec(content)) !== null) {
        const line = content.substr(0, match.index).split('\n').length;
        
        this.issues.push({
          file: relativePath,
          line,
          column: 1,
          severity: 'warning',
          message: `Potentially unused variable: ${match[1]}`,
          rule: 'custom/unused-variable',
          category: 'Code Quality'
        });
      }
    }
  }

  private async checkForConsoleLogs() {
    const files = this.findFiles(this.rootDir, this.fileExtensions);
    
    for (const file of files) {
      // Skip test files
      if (file.includes('.test.') || file.includes('__tests__')) {
        continue;
      }
      
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);
      
      // Check for console.log and friends
      const consoleRegex = /console\.(log|warn|error|info|debug|trace|time|timeEnd|timeLog|timeStamp|group|groupCollapsed|groupEnd|clear|count|countReset|dir|dirxml|table|assert|profile|profileEnd)(\s*\()/g;
      
      let match;
      while ((match = consoleRegex.exec(content)) !== null) {
        const line = content.substr(0, match.index).split('\n').length;
        
        this.issues.push({
          file: relativePath,
          line,
          column: 1,
          severity: 'warning',
          message: `Found ${match[1]} in production code`,
          rule: 'no-console',
          category: 'Best Practices'
        });
      }
    }
  }

  private findFiles(dir: string, extensions: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat && stat.isDirectory()) {
        // Skip node_modules and other common directories
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
          continue;
        }
        results = results.concat(this.findFiles(fullPath, extensions));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
    
    return results;
  }

  private analyzeResults() {
    // Categorize issues
    for (const issue of this.issues) {
      // Count by category
      this.categories[issue.category] = (this.categories[issue.category] || 0) + 1;
      
      // Count by rule
      if (issue.rule) {
        this.rules[issue.rule] = (this.rules[issue.rule] || 0) + 1;
      }
    }
  }

  private generateReport() {
    console.log('\n' + chalk.green.bold('📊 Analysis Complete!') + '\n');
    
    // Print summary by category
    console.log(chalk.underline.bold('📋 Summary by Category:'));
    for (const [category, count] of Object.entries(this.categories)) {
      console.log(`  ${category.padEnd(20)}: ${count} issues`);
    }
    
    // Print top issues by rule
    console.log('\n' + chalk.underline.bold('🔝 Top Issues by Rule:'));
    const sortedRules = Object.entries(this.rules)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [rule, count] of sortedRules) {
      console.log(`  ${rule.padEnd(40)}: ${count} occurrences`);
    }
    
    // Print some example issues
    if (this.issues.length > 0) {
      console.log('\n' + chalk.underline.bold('🔍 Example Issues:'));
      const sampleIssues = this.issues.slice(0, 5);
      
      for (const issue of sampleIssues) {
        const severityColor = issue.severity === 'error' ? 'red' : 'yellow';
        console.log(
          `\n${chalk.gray(issue.file)}:${issue.line}:${issue.column} - ` +
          `${chalk[severityColor](issue.severity)}: ${issue.message}` +
          (issue.rule ? `\n  Rule: ${issue.rule}` : '')
        );
      }
      
      if (this.issues.length > 5) {
        console.log(`\n... and ${this.issues.length - 5} more issues found.`);
      }
    }
    
    console.log('\n' + chalk.bold('✅ Analysis complete!'));
    console.log(`📊 Total issues found: ${this.issues.length}`);
  }
}

// Run the analysis
const analyzer = new IssueAnalyzer(process.cwd());
analyzer.runAnalysis().catch(console.error);
