import React from "react";
import { X } from "lucide-react";

type EditorTab = {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty?: boolean;
};

type EditorTabsProps = {
  files: EditorTab[];
  activeFile: string;
  onTabChange: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  className?: string;
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  activeFile,
  onTabChange,
  onTabClose,
  className = "",
}) => {
  if (files.length === 0) {
    return (
      <div
        className={`h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto ${className}`}
    >
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
            activeFile === file.id
              ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400"
              : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
          onClick={() => onTabChange(file.id)}
        >
          <span className="mr-2">{getFileIcon(file.name, file.language)}</span>
          <span className="max-w-[200px] truncate">
            {file.name}
            {file.isDirty && " •"}
          </span>
          <button
            className="ml-2 p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(file.id);
            }}
            aria-label={`Close ${file.name}`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

function getFileIcon(filename: string, language?: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  // Language-specific icons (takes precedence over file extension)
  const languageIcons: Record<string, string> = {
    javascript: "\uec68",
    typescript: "\ue628",
    python: "\ue73c",
    java: "\ue738",
    c: "\ue61e",
    cpp: "\ue61d",
    csharp: "\uf81a",
    go: "\ue65e",
    php: "\ue73d",
    ruby: "\ue739",
    rust: "\ue7a8",
    swift: "\ue755",
    kotlin: "\ue634",
    dart: "\ue798",
    html: "\ue736",
    css: "\ue749",
    scss: "\ue74b",
    less: "\ue758",
    json: "\ue60b",
    yaml: "\uf19a",
    markdown: "\ue73e",
    dockerfile: "\uf308",
    bash: "\uf489",
    shell: "\uf489",
    sql: "\ue0fe",
    graphql: "\ue33b",
    vue: "\ue7ba",
    svelte: "\ue697",
  };

  // File extension fallbacks
  const extensionIcons: Record<string, string> = {
    // Code files
    js: "\uec68",
    jsx: "\ue7ba",
    ts: "\ue628",
    tsx: "\ue7ba",
    py: "\ue73c",
    java: "\ue738",
    c: "\ue61e",
    h: "\ue61e",
    cpp: "\ue61d",
    hpp: "\ue61d",
    cs: "\uf81a",
    go: "\ue65e",
    php: "\ue73d",
    rb: "\ue739",
    rs: "\ue7a8",
    swift: "\ue755",
    kt: "\ue634",
    dart: "\ue798",

    // Web
    html: "\ue736",
    htm: "\ue736",
    css: "\ue749",
    scss: "\ue74b",
    sass: "\ue74b",
    less: "\ue758",
    json: "\ue60b",

    // Config
    yaml: "\uf19a",
    yml: "\uf19a",
    toml: "\ue615",
    ini: "\ue615",
    env: "\uf462",
    gitignore: "\uf1d3",
    gitmodules: "\uf1d3",

    // Documents
    md: "\ue73e",
    markdown: "\ue73e",
    txt: "\uf15c",
    pdf: "\uf1c1",
    doc: "\uf1c2",
    docx: "\uf1c2",
    xls: "\uf1c3",
    xlsx: "\uf1c3",
    ppt: "\uf1c4",
    pptx: "\uf1c4",

    // Images
    png: "\uf1c5",
    jpg: "\uf1c5",
    jpeg: "\uf1c5",
    gif: "\uf1c5",
    svg: "\uf1c5",
    ico: "\uf1c5",
    webp: "\uf1c5",

    // Archives
    zip: "\uf1c6",
    rar: "\uf1c6",
    "7z": "\uf1c6",
    tar: "\uf1c6",
    gz: "\uf1c6",
    bz2: "\uf1c6",
    xz: "\uf1c6",
  };

  // Check for language-specific icon first, then file extension, then default
  return (
    (language && languageIcons[language.toLowerCase()]) ||
    extensionIcons[extension] ||
    "\uf15b" // Default document icon
  );
}

// Default export for backward compatibility
export const EditorTabs = EditorTabs;

// Named exports
export { EditorTabs };
export default EditorTabs;
