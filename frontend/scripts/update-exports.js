import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components');
const IGNORE_DIRS = ['__tests__', 'test-utils', 'mocks', 'stories', 'dist', 'build', 'node_modules'];
const COMPONENT_EXTENSIONS = ['.tsx', '.ts'];

// Get all component files
function getComponentFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (IGNORE_DIRS.includes(item.name)) continue;
    
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      results = [...results, ...getComponentFiles(fullPath)];
    } else if (COMPONENT_EXTENSIONS.includes(path.extname(item.name))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Update exports in a file
function updateExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const componentName = path.basename(filePath, path.extname(filePath));
  const dirName = path.dirname(filePath);
  const isIndexFile = componentName === 'index';
  
  // Skip if it's not a component file
  if (isIndexFile || !/export\s+(default\s+)?(function|const|class|interface|type)\s+\w+/i.test(content)) {
    return;
  }
  
  // Check if exports already exist
  if (content.includes('export {') || content.includes('export type {')) {
    console.log(`Skipping ${filePath} - exports already exist`);
    return;
  }
  
  // Add exports at the end of the file
  let newContent = content.trim();
  
  // Add named export if it's a default export
  if (content.includes('export default')) {
    newContent = newContent.replace('export default', '// Default export for backward compatibility\nexport const ' + componentName + ' =');
    newContent += '\n\n// Named exports\nexport { ' + componentName + ' };\nexport default ' + componentName + ';\n';
  } else {
    // For non-default exports, just add a named export
    newContent += '\n\n// Exports\nexport { ' + componentName + ' };\n';
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated exports in ${filePath}`);
}

// Create or update index.ts files
function updateIndexFiles() {
  const dirs = [];
  
  // Find all directories that contain components
  function findDirs(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if this directory has component files
    const hasComponents = items.some(item => 
      !item.isDirectory() && 
      COMPONENT_EXTENSIONS.includes(path.extname(item.name)) &&
      item.name !== 'index.ts' && 
      item.name !== 'index.tsx'
    );
    
    if (hasComponents) {
      dirs.push(dir);
    }
    
    // Recursively check subdirectories
    for (const item of items) {
      if (item.isDirectory() && !IGNORE_DIRS.includes(item.name)) {
        findDirs(path.join(dir, item.name));
      }
    }
  }
  
  findDirs(COMPONENTS_DIR);
  
  // Create/update index.ts files
  for (const dir of dirs) {
    const indexPath = path.join(dir, 'index.ts');
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Get all component files in this directory
    const componentFiles = items
      .filter(item => 
        !item.isDirectory() && 
        item.name !== 'index.ts' && 
        item.name !== 'index.tsx' &&
        COMPONENT_EXTENSIONS.includes(path.extname(item.name))
      )
      .map(item => ({
        name: item.name.replace(/\.[^/.]+$/, ''),
        path: './' + item.name.replace(/\.[^/.]+$/, '')
      }));
    
    if (componentFiles.length === 0) continue;
    
    // Generate index.ts content
    let indexContent = '// Auto-generated file - DO NOT EDIT\n\n';
    
    // Add barrel exports for each component
    componentFiles.forEach(({ name, path }) => {
      indexContent += `export * from '${path}';\n`;
    });
    
    // Add default export for the main component (if exists)
    const mainComponent = componentFiles.find(f => f.name === path.basename(dir));
    if (mainComponent) {
      indexContent += `\n// Default export for backward compatibility\nexport { ${mainComponent.name} as default } from '${mainComponent.path}';\n`;
    }
    
    // Write the index file
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`Updated ${indexPath}`);
  }
}

// Main function
function main() {
  console.log('Updating component exports...');
  
  // Update individual component files
  const componentFiles = getComponentFiles(COMPONENTS_DIR);
  componentFiles.forEach(updateExports);
  
  // Update index files
  updateIndexFiles();
  
  console.log('\nRunning TypeScript type checking...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('\n✅ All exports updated successfully!');
  } catch (error) {
    console.error('\n⚠️  TypeScript errors found. Please fix them before committing.');
    process.exit(1);
  }
}

// Run the script
main();
