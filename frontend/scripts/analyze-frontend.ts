import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration
const config = {
  // Directories to scan
  scanDirs: [
    'src',
    'public',
    'scripts'
  ],
  // File extensions to include
  includeExtensions: [
    '.ts', '.tsx', '.js', '.jsx', 
    '.css', '.scss', '.json', 
    '.html', '.md', '.svg', '.png', '.jpg', '.jpeg'
  ],
  // Directories to exclude
  excludeDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.vscode',
    '.idea',
    'coverage',
    '__tests__',
    '__mocks__',
    '*.d.ts',
    '*.test.*',
    '*.spec.*'
  ]
};

// Types
interface FileInfo {
  path: string;
  size: number;
  extension: string;
  lastModified: Date;
}

interface DirectoryStats {
  totalFiles: number;
  totalSize: number;
  byExtension: Record<string, { count: number; size: number }>;
  largestFiles: Array<{ path: string; size: number }>;
  oldestFiles: Array<{ path: string; date: Date }>;
  newestFiles: Array<{ path: string; date: Date }>;
}

// Main function
async function analyzeFrontend() {
  console.log('🔍 Analyzing frontend files...\n');
  
  // Get all files
  const allFiles: FileInfo[] = [];
  
  for (const dir of config.scanDirs) {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = await getFilesRecursively(dirPath);
      allFiles.push(...files);
    }
  }
  
  // Generate statistics
  const stats = generateStats(allFiles);
  
  // Print report
  printReport(stats);
  
  // Save report to file
  saveReport(stats);
  
  console.log('\n✅ Analysis complete! Check frontend-analysis.json for detailed results.');
}

// Recursively get all files in a directory
async function getFilesRecursively(dir: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(rootDir, fullPath);
    
    // Skip excluded directories and files
    if (config.excludeDirs.some(exclude => 
      item.isDirectory() ? 
        item.name === exclude || relativePath.includes(`${path.sep}${exclude}${path.sep}`) :
        exclude.startsWith('*.') ? 
          item.name.endsWith(exclude.substring(1)) : 
          false
    )) {
      continue;
    }
    
    if (item.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath);
      files.push(...subFiles);
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (config.includeExtensions.includes(ext)) {
        const stats = fs.statSync(fullPath);
        files.push({
          path: relativePath,
          size: stats.size,
          extension: ext,
          lastModified: stats.mtime
        });
      }
    }
  }
  
  return files;
}

// Generate statistics from file list
function generateStats(files: FileInfo[]): DirectoryStats {
  const stats: DirectoryStats = {
    totalFiles: files.length,
    totalSize: 0,
    byExtension: {},
    largestFiles: [],
    oldestFiles: [],
    newestFiles: []
  };
  
  // Process each file
  for (const file of files) {
    // Update total size
    stats.totalSize += file.size;
    
    // Update extension stats
    if (!stats.byExtension[file.extension]) {
      stats.byExtension[file.extension] = { count: 0, size: 0 };
    }
    stats.byExtension[file.extension].count++;
    stats.byExtension[file.extension].size += file.size;
    
    // Track largest files
    stats.largestFiles.push({ path: file.path, size: file.size });
    
    // Track oldest and newest files
    stats.oldestFiles.push({ path: file.path, date: file.lastModified });
    stats.newestFiles.push({ path: file.path, date: file.lastModified });
  }
  
  // Sort and limit the special lists
  stats.largestFiles.sort((a, b) => b.size - a.size).splice(10);
  stats.oldestFiles.sort((a, b) => a.date.getTime() - b.date.getTime()).splice(10);
  stats.newestFiles.sort((a, b) => b.date.getTime() - a.date.getTime()).splice(10);
  
  return stats;
}

// Print report to console
function printReport(stats: DirectoryStats) {
  console.log('📊 Frontend Analysis Report');
  console.log('='.repeat(50));
  
  // Basic stats
  console.log(`\n📂 Total Files: ${stats.totalFiles.toLocaleString()}`);
  console.log(`📦 Total Size: ${formatFileSize(stats.totalSize)}`);
  
  // Files by extension
  console.log('\n📄 Files by Extension:');
  const sortedExtensions = Object.entries(stats.byExtension)
    .sort(([, a], [, b]) => b.count - a.count);
    
  for (const [ext, data] of sortedExtensions) {
    const percentage = ((data.count / stats.totalFiles) * 100).toFixed(1);
    console.log(`  ${ext.padEnd(8)}: ${data.count.toString().padEnd(6)} files (${percentage}%) - ${formatFileSize(data.size)}`);
  }
  
  // Largest files
  console.log('\n🏆 Largest Files:');
  for (const file of stats.largestFiles) {
    console.log(`  ${formatFileSize(file.size).padEnd(10)} ${file.path}`);
  }
  
  // Newest files
  console.log('\n🆕 Newest Files:');
  for (const file of stats.newestFiles) {
    console.log(`  ${file.date.toISOString().split('T')[0]} ${file.path}`);
  }
  
  console.log('\n' + '='.repeat(50));
}

// Save report to JSON file
function saveReport(stats: DirectoryStats) {
  const report = {
    generatedAt: new Date().toISOString(),
    stats: {
      ...stats,
      // Convert dates to ISO strings for JSON serialization
      oldestFiles: stats.oldestFiles.map(f => ({
        path: f.path,
        date: f.date.toISOString()
      })),
      newestFiles: stats.newestFiles.map(f => ({
        path: f.path,
        date: f.date.toISOString()
      }))
    }
  };
  
  fs.writeFileSync(
    path.join(rootDir, 'frontend-analysis.json'),
    JSON.stringify(report, null, 2)
  );
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Run the analysis
analyzeFrontend().catch(console.error);
