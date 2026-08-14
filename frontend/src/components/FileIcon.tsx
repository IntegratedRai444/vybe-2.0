import React from "react";

type Props = {
  fileName: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: "sm" | "md" | "lg";
};

export const FileIcon: React.FC<Props> = ({
  fileName,
  isFolder = false,
  isOpen = false,
  size = "md",
}) => {
  const getIcon = () => {
    if (isFolder) {
      return isOpen ? "📂" : "📁";
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    // Programming languages
    if (["js", "jsx"].includes(ext)) return "🟨";
    if (["ts", "tsx"].includes(ext)) return "🔷";
    if (ext === "py") return "🐍";
    if (ext === "java") return "☕";
    if (["cpp", "cc", "cxx"].includes(ext)) return "⚙️";
    if (ext === "c") return "🔧";
    if (ext === "cs") return "🔵";
    if (ext === "go") return "🐹";
    if (ext === "rs") return "🦀";
    if (ext === "php") return "🐘";
    if (ext === "rb") return "💎";
    if (ext === "swift") return "🦉";
    if (ext === "kt") return "🟣";

    // Web technologies
    if (ext === "html") return "🌐";
    if (ext === "css") return "🎨";
    if (["scss", "sass"].includes(ext)) return "💅";
    if (ext === "json") return "📋";
    if (["yml", "yaml"].includes(ext)) return "📄";
    if (ext === "xml") return "📰";

    // Documentation
    if (ext === "md") return "📝";
    if (ext === "txt") return "📄";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["pdf"].includes(ext)) return "📕";

    // Images
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "🖼️";
    if (["ico", "icon"].includes(ext)) return "🎯";

    // Data & Config
    if (["sql", "db", "sqlite"].includes(ext)) return "🗄️";
    if (["env", "config", "conf", "cfg"].includes(ext)) return "⚙️";
    if (["log"].includes(ext)) return "📊";

    // Archives
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";

    // Executables
    if (["exe", "msi", "dmg", "deb", "rpm"].includes(ext)) return "⚡";

    // Special files
    if (fileName === "package.json") return "📦";
    if (fileName === "tsconfig.json") return "🔷";
    if (fileName === "webpack.config.js") return "📦";
    if (fileName === "vite.config.ts") return "⚡";
    if (fileName === "tailwind.config.js") return "🎨";
    if (fileName === ".gitignore") return "🚫";
    if (fileName === "README.md") return "📖";
    if (fileName === "LICENSE") return "📜";
    if (fileName === "Dockerfile") return "🐳";
    if (fileName === "docker-compose.yml") return "🐳";

    return "📄";
  };

  const sizeClass = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <span className={`${sizeClass} mr-2`} title={fileName}>
      {getIcon()}
    </span>
  );
};

// Exports
export { FileIcon };
