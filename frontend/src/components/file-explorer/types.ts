export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  modified?: string;
  children?: FileItem[];
  selected?: boolean;
}

export type SearchOptions = {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  fileTypes: string[];
  excludePatterns: string[];
  includePatterns: string[];
};

export type BulkOperation = {
  type: "copy" | "move" | "delete" | "download" | "rename";
  files: string[];
  destination?: string;
  newName?: string;
};

export type SortField = "name" | "size" | "modified" | "type";
export type SortOrder = "asc" | "desc";
export type ViewMode = "list" | "grid";

export type FileExplorerProps = {
  projectRoot: string;
  onFileSelect?: (file: string) => void;
};

// Exports
export { types };
