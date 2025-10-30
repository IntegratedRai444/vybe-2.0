import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vercel',
  '.github',
  '__tests__',
  '__mocks__',
  'coverage',
  'public',
  'scripts',
  'types',
];

// Get all TypeScript/JavaScript files
function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (IGNORE_DIRS.some(ignoreDir => filePath.includes(ignoreDir))) {
      return;
    }

    if (stat.isDirectory()) {
      getAllSourceFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(path.relative(PROJECT_ROOT, filePath));
    }
  });

  return fileList;
}

// Get all import statements from a file
function getImports(filePath) {
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, filePath), 'utf-8');
    const importRegex = /from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && !importPath.startsWith('.') && !importPath.startsWith('@/')) {
        continue; // Skip node_modules imports
      }
      if (importPath) {
        imports.push(importPath);
      }
    }

    return imports;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Main function
function findUnusedFiles() {
  console.log('🔍 Scanning for unused files...\n');
  
  // Get all source files
  const allFiles = getAllSourceFiles(PROJECT_ROOT);
  const usedFiles = new Set();
  const importMap = new Map();

  // First pass: build import map
  allFiles.forEach(file => {
    const imports = getImports(file);
    importMap.set(file, imports);
  });

  // Second pass: find unused files
  const unusedFiles = allFiles.filter(file => {
    // Skip entry points and config files
    if (file.endsWith('main.tsx') || 
        file.endsWith('App.tsx') || 
        file.endsWith('index.ts') ||
        file.endsWith('index.tsx')) {
      return false;
    }

    // Check if this file is imported anywhere
    for (const [_, imports] of importMap.entries()) {
      const relativePath = path.relative(path.dirname(_), path.join(PROJECT_ROOT, file));
      const importPath = relativePath.startsWith('..') ? relativePath : './' + relativePath;
      
      if (imports.some(imp => 
        imp.replace(/\.[^/.]+$/, '') === importPath.replace(/\.(tsx?|jsx?)$/, '')
      )) {
        return false;
      }
    }
    
    return true;
  });

  console.log('🚫 Potentially unused files:');
  unusedFiles.forEach(file => console.log(`- ${file}`));
  
  console.log(`\nFound ${unusedFiles.length} potentially unused files out of ${allFiles.length} total files.`);
  
  return unusedFiles;
}

// Run the script
findUnusedFiles();
