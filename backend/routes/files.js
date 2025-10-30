import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: 'uploads/' });

// File watchers for real-time updates
const watchers = new Map();

export function setupFileRoutes(app) {
  
  // List files and folders in a directory
  app.get('/folder', async (req, res) => {
    try {
      const { root } = req.query;
      if (!root) {
        return res.status(400).json({ error: 'Root parameter is required' });
      }

      const folderData = await buildFileTree(root);
      res.json(folderData);
    } catch (error) {
      console.error('Error listing folder:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get file content
  app.get('/file', async (req, res) => {
    try {
      const { path: filePath } = req.query;
      if (!filePath) {
        return res.status(400).json({ error: 'Path parameter is required' });
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      res.json({
        content,
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        path: filePath
      });
    } catch (error) {
      console.error('Error reading file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save file content
  app.post('/file', async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Path and content are required' });
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, 'utf-8');
      const stats = await fs.stat(filePath);

      res.json({
        success: true,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      });
    } catch (error) {
      console.error('Error saving file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new file
  app.post('/file/create', async (req, res) => {
    try {
      const { path: filePath, content = '' } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: 'Path is required' });
      }

      // Check if file already exists
      try {
        await fs.access(filePath);
        return res.status(409).json({ error: 'File already exists' });
      } catch {
        // File doesn't exist, continue
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, 'utf-8');
      const stats = await fs.stat(filePath);

      res.json({
        success: true,
        path: filePath,
        size: stats.size,
        created: stats.birthtime
      });
    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete file or folder
  app.delete('/file', async (req, res) => {
    try {
      const { path: targetPath } = req.query;
      if (!targetPath) {
        return res.status(400).json({ error: 'Path parameter is required' });
      }

      const stats = await fs.stat(targetPath);
      
      if (stats.isDirectory()) {
        await fs.rmdir(targetPath, { recursive: true });
      } else {
        await fs.unlink(targetPath);
      }

      res.json({
        success: true,
        path: targetPath,
        type: stats.isDirectory() ? 'directory' : 'file'
      });
    } catch (error) {
      console.error('Error deleting file/folder:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Rename/move file or folder
  app.put('/file/rename', async (req, res) => {
    try {
      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath) {
        return res.status(400).json({ error: 'oldPath and newPath are required' });
      }

      // Ensure target directory exists
      const dir = path.dirname(newPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.rename(oldPath, newPath);
      const stats = await fs.stat(newPath);

      res.json({
        success: true,
        oldPath,
        newPath,
        modified: stats.mtime
      });
    } catch (error) {
      console.error('Error renaming file/folder:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search files
  app.get('/search', async (req, res) => {
    try {
      const { query, root, includeContent = false } = req.query;
      if (!query || !root) {
        return res.status(400).json({ error: 'Query and root parameters are required' });
      }

      const results = await searchFiles(root, query, includeContent === 'true');
      res.json({ results, query, root });
    } catch (error) {
      console.error('Error searching files:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Watch directory for changes
  app.post('/watch', (req, res) => {
    try {
      const { path: watchPath, clientId } = req.body;
      if (!watchPath || !clientId) {
        return res.status(400).json({ error: 'Path and clientId are required' });
      }

      if (watchers.has(clientId)) {
        watchers.get(clientId).close();
      }

      const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
      });

      watcher
        .on('add', path => console.log(`File ${path} has been added`))
        .on('change', path => console.log(`File ${path} has been changed`))
        .on('unlink', path => console.log(`File ${path} has been removed`));

      watchers.set(clientId, watcher);

      res.json({ success: true, watching: watchPath, clientId });
    } catch (error) {
      console.error('Error setting up file watcher:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload files
  app.post('/upload', upload.array('files'), async (req, res) => {
    try {
      const { destination = '.' } = req.body;
      const uploadedFiles = [];

      for (const file of req.files) {
        const targetPath = path.join(destination, file.originalname);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.rename(file.path, targetPath);
        
        const stats = await fs.stat(targetPath);
        uploadedFiles.push({
          name: file.originalname,
          path: targetPath,
          size: stats.size,
          uploaded: new Date().toISOString()
        });
      }

      res.json({ success: true, files: uploadedFiles });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Index project (for search and IntelliSense)
  app.post('/index', async (req, res) => {
    try {
      const { path: projectPath } = req.body;
      if (!projectPath) {
        return res.status(400).json({ error: 'Path is required' });
      }

      // Build file index
      const fileTree = await buildFileTree(projectPath);
      const fileList = flattenFileTree(fileTree);
      
      // Analyze project structure
      const analysis = await analyzeProject(projectPath, fileList);

      res.json({
        success: true,
        path: projectPath,
        fileCount: fileList.length,
        analysis,
        indexed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error indexing project:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Helper functions
async function buildFileTree(rootPath) {
  const stats = await fs.stat(rootPath);
  const name = path.basename(rootPath);

  if (stats.isFile()) {
    return {
      name,
      path: rootPath,
      type: 'file',
      size: stats.size,
      modified: stats.mtime
    };
  }

  const children = [];
  try {
    const items = await fs.readdir(rootPath);
    
    for (const item of items) {
      // Skip hidden files and common ignore patterns
      if (item.startsWith('.') || 
          item === 'node_modules' || 
          item === '__pycache__' ||
          item === '.git') {
        continue;
      }

      const itemPath = path.join(rootPath, item);
      try {
        const child = await buildFileTree(itemPath);
        children.push(child);
      } catch (error) {
        // Skip files we can't read
        console.warn(`Skipping ${itemPath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`Cannot read directory ${rootPath}: ${error.message}`);
  }

  return {
    name,
    path: rootPath,
    type: 'folder',
    children: children.sort((a, b) => {
      // Folders first, then files, both alphabetically
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }),
    size: stats.size,
    modified: stats.mtime
  };
}

function flattenFileTree(tree) {
  const files = [];
  
  if (tree.type === 'file') {
    files.push(tree);
  } else if (tree.children) {
    for (const child of tree.children) {
      files.push(...flattenFileTree(child));
    }
  }
  
  return files;
}

async function searchFiles(rootPath, query, includeContent) {
  const results = [];
  const searchRegex = new RegExp(query, 'i');

  async function searchInDirectory(dirPath) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await searchInDirectory(itemPath);
        } else if (stats.isFile()) {
          // Search filename
          if (searchRegex.test(item)) {
            results.push({
              path: itemPath,
              name: item,
              type: 'filename',
              match: item
            });
          }
          
          // Search content if requested
          if (includeContent && isTextFile(item)) {
            try {
              const content = await fs.readFile(itemPath, 'utf-8');
              const lines = content.split('\n');
              
              lines.forEach((line, index) => {
                if (searchRegex.test(line)) {
                  results.push({
                    path: itemPath,
                    name: item,
                    type: 'content',
                    line: index + 1,
                    match: line.trim(),
                    context: lines.slice(Math.max(0, index - 1), index + 2)
                  });
                }
              });
            } catch (error) {
              // Skip files we can't read
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await searchInDirectory(rootPath);
  return results;
}

function isTextFile(filename) {
  const textExtensions = [
    '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c',
    '.h', '.css', '.scss', '.html', '.xml', '.json', '.yaml', '.yml', '.toml',
    '.ini', '.cfg', '.conf', '.sh', '.bat', '.ps1', '.sql', '.php', '.rb',
    '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.elm', '.vue',
    '.svelte', '.astro', '.dockerfile', '.gitignore', '.env'
  ];
  
  const ext = path.extname(filename).toLowerCase();
  return textExtensions.includes(ext) || !ext; // Include files without extension
}

async function analyzeProject(projectPath, fileList) {
  const analysis = {
    languages: {},
    frameworks: [],
    packageManagers: [],
    totalFiles: fileList.length,
    totalSize: 0
  };

  // Analyze file types
  for (const file of fileList) {
    const ext = path.extname(file.name).toLowerCase();
    analysis.languages[ext] = (analysis.languages[ext] || 0) + 1;
    analysis.totalSize += file.size || 0;
  }

  // Detect frameworks and tools
  const packageJsonPath = path.join(projectPath, 'package.json');
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) analysis.frameworks.push('React');
    if (deps.vue) analysis.frameworks.push('Vue');
    if (deps.angular) analysis.frameworks.push('Angular');
    if (deps.svelte) analysis.frameworks.push('Svelte');
    if (deps.next) analysis.frameworks.push('Next.js');
    if (deps.nuxt) analysis.frameworks.push('Nuxt.js');
    if (deps.express) analysis.frameworks.push('Express');
    if (deps.fastify) analysis.frameworks.push('Fastify');
    
    analysis.packageManagers.push('npm');
  } catch (error) {
    // No package.json or can't read it
  }

  // Check for other package managers
  try {
    await fs.access(path.join(projectPath, 'yarn.lock'));
    analysis.packageManagers.push('yarn');
  } catch {}

  try {
    await fs.access(path.join(projectPath, 'pnpm-lock.yaml'));
    analysis.packageManagers.push('pnpm');
  } catch {}

  try {
    await fs.access(path.join(projectPath, 'requirements.txt'));
    analysis.packageManagers.push('pip');
  } catch {}

  try {
    await fs.access(path.join(projectPath, 'Cargo.toml'));
    analysis.packageManagers.push('cargo');
  } catch {}

  return analysis;
}