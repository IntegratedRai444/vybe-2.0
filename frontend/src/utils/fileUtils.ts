/**
 * Extracts the file extension from a filename
 * @param filename The filename to extract extension from
 * @returns The file extension without the dot, or empty string if no extension
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
};

/**
 * Gets the language based on file extension
 * @param filename The filename to determine language for
 * @returns The language name for syntax highlighting
 */
export const getLanguageFromExtension = (filename: string): string => {
  const ext = getFileExtension(filename);

  const languageMap: Record<string, string> = {
    // Web
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    md: "markdown",
    markdown: "markdown",

    // Python
    py: "python",
    pyw: "python",
    pyi: "python",

    // Java
    java: "java",
    class: "java",
    jar: "java",

    // C/C++
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cc: "cpp",
    cxx: "cpp",

    // C#
    cs: "csharp",

    // Go
    go: "go",

    // Rust
    rs: "rust",

    // Ruby
    rb: "ruby",

    // PHP
    php: "php",
    phtml: "php",

    // Shell
    sh: "shell",
    bash: "bash",
    zsh: "bash",

    // Configuration
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    env: "properties",

    // Docker
    dockerfile: "dockerfile",
    dockerignore: "dockerfile",

    // Git
    gitignore: "gitignore",
    gitattributes: "gitattributes",

    // Makefile
    makefile: "makefile",
    mk: "makefile",

    // SQL
    sql: "sql",

    // XML
    xml: "xml",
    xsd: "xml",
    xslt: "xml",

    // Misc
    txt: "text",
    log: "text",
    csv: "csv",
    diff: "diff",
    patch: "diff",
  };

  return languageMap[ext] || "plaintext";
};

/**
 * Gets the appropriate icon for a file based on its extension
 * @param filename The filename to get icon for
 * @returns The name of the icon to use
 */
export const getFileIcon = (filename: string): string => {
  const ext = getFileExtension(filename);

  // File type to icon mapping
  const iconMap: Record<string, string> = {
    // Code files
    js: "file-js",
    jsx: "file-jsx",
    ts: "file-ts",
    tsx: "file-tsx",
    html: "file-html",
    css: "file-css",
    scss: "file-scss",
    sass: "file-sass",
    less: "file-less",
    json: "file-json",
    md: "file-markdown",
    markdown: "file-markdown",
    py: "file-python",
    java: "file-java",
    c: "file-c",
    cpp: "file-cpp",
    cs: "file-csharp",
    go: "file-go",
    rs: "file-rust",
    rb: "file-ruby",
    php: "file-php",
    sh: "file-bash",
    yaml: "file-yaml",
    yml: "file-yaml",
    toml: "file-toml",
    sql: "file-sql",
    xml: "file-xml",
    dockerfile: "file-docker",
    makefile: "file-makefile",

    // Document files
    pdf: "file-pdf",
    doc: "file-word",
    docx: "file-word",
    xls: "file-excel",
    xlsx: "file-excel",
    ppt: "file-powerpoint",
    pptx: "file-powerpoint",
    txt: "file-text",
    csv: "file-csv",

    // Media files
    jpg: "file-image",
    jpeg: "file-image",
    png: "file-image",
    gif: "file-image",
    svg: "file-image",
    mp3: "file-audio",
    wav: "file-audio",
    mp4: "file-video",
    mov: "file-video",
    avi: "file-video",
    zip: "file-zip",
    rar: "file-zip",
    tar: "file-zip",
    gz: "file-zip",
  };

  return iconMap[ext] || "file";
};

/**
 * Validates if a filename is valid
 * @param name The filename to validate
 * @returns An error message if invalid, empty string if valid
 */
export const validateFilename = (name: string): string => {
  if (!name.trim()) {
    return "Filename cannot be empty";
  }

  // Check for invalid characters
  const invalidChars = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"];
  for (const char of invalidChars) {
    if (name.includes(char)) {
      return `Filename cannot contain: ${char}`;
    }
  }

  // Check for reserved names (Windows)
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];

  const nameWithoutExt = name.split(".").shift() || "";
  if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
    return `${nameWithoutExt} is a reserved name`;
  }

  return "";
};

/**
 * Generates a unique filename by appending a number if the file already exists
 * @param filename The desired filename
 * @param existingFilenames Array of existing filenames to check against
 * @returns A unique filename
 */
export const getUniqueFilename = (
  filename: string,
  existingFilenames: string[],
): string => {
  if (!existingFilenames.includes(filename)) {
    return filename;
  }

  const ext = getFileExtension(filename);
  const baseName = filename.substring(
    0,
    filename.length - (ext ? ext.length + 1 : 0),
  );

  let counter = 1;
  let newName = "";

  do {
    newName = ext
      ? `${baseName} (${counter}).${ext}`
      : `${baseName} (${counter})`;
    counter++;
  } while (existingFilenames.includes(newName));

  return newName;
};
