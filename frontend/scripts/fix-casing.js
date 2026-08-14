import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COMPONENTS_DIR = path.join(__dirname, "..", "src", "components");

// Fix file casing issues
function fixFileCasing(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Recursively process subdirectories
      fixFileCasing(fullPath);
    } else {
      // Check for incorrect casing
      const ext = path.extname(item.name);
      const base = path.basename(item.name, ext);

      // If the file is lowercase but should be PascalCase for components
      if (
        base[0] === base[0].toLowerCase() &&
        base !== "index" &&
        (ext === ".tsx" || ext === ".ts") &&
        !base.includes(".")
      ) {
        const newName = base[0].toUpperCase() + base.slice(1) + ext;
        const newPath = path.join(dir, newName);

        // Only rename if the target doesn't already exist
        if (!fs.existsSync(newPath)) {
          console.log(`Renaming ${item.name} to ${newName}`);
          fs.renameSync(fullPath, newPath);

          // Update imports in other files
          updateImports(
            path.relative(path.join(COMPONENTS_DIR, ".."), dir),
            base + ext,
            newName,
          );
        }
      }
    }
  }
}

// Update imports in files to use the correct casing
function updateImports(relativeDir, oldName, newName) {
  const srcDir = path.join(COMPONENTS_DIR, "..");

  function processFile(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    const oldImport = new RegExp(
      `from ['"](\.{1,2}\/)*${relativeDir.replace(
        /\//g,
        "\\/",
      )}\/${oldName.replace(/\./g, "\\.")}['"]`,
      "g",
    );
    const newImport = `from './${relativeDir}/${newName}'`;

    if (oldImport.test(content)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Updated imports in ${filePath}`);
    }
  }

  // Process all TypeScript/JavaScript files
  function processDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        processDirectory(fullPath);
      } else if (
        item.name.endsWith(".ts") ||
        item.name.endsWith(".tsx") ||
        item.name.endsWith(".js") ||
        item.name.endsWith(".jsx")
      ) {
        processFile(fullPath);
      }
    }
  }

  processDirectory(srcDir);
}

// Run the script
console.log("Fixing file casing issues...");
fixFileCasing(COMPONENTS_DIR);
console.log("Done fixing file casing!");
