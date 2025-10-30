// File system item with package management support
export interface FileSystemItem {
  name: string;
  type: 'file' | 'folder' | 'package' | 'dependency';
  path: string;
  children?: FileSystemItem[];
  size?: number;
  modified?: string;
  created?: string;
  isOpen?: boolean;
  isSelected?: boolean;
  isDirty?: boolean; // Track unsaved changes
  isLocked?: boolean; // For files being processed
  metadata?: {
    packageName?: string;
    version?: string;
    dependencies?: PackageDependency[];
    devDependencies?: PackageDependency[];
    scripts?: Record<string, string>;
    repository?: string;
    license?: string;
  };
}

export interface PackageDependency {
  name: string;
  version: string;
  latestVersion?: string;
  isDev?: boolean;
  isOutdated?: boolean;
  vulnerabilities?: Vulnerability[];
}

export interface Vulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  patchedIn?: string;
  url: string;
}

export interface FileSystemState {
  root: string;
  files: FileSystemItem[];
  expandedFolders: Set<string>;
  selectedFile: string | null;
  loading: boolean;
  error: string | null;
  currentPath: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | null;
  deployment: {
    targets: DeploymentTarget[];
    currentTarget: string | null;
    status: 'idle' | 'deploying' | 'success' | 'error';
    lastDeployed?: string;
    deploymentLogs: string[];
  };
  git: {
    branch: string;
    status: 'clean' | 'dirty' | 'uncommitted' | 'conflict';
    lastCommit?: {
      hash: string;
      message: string;
      author: string;
      date: string;
    };
    remote?: {
      name: string;
      url: string;
    };
  };
  packageJsonPath?: string; // Path to nearest package.json
}

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'vercel' | 'netlify' | 'aws' | 'custom';
  url?: string;
  lastDeployed?: string;
  status?: 'success' | 'failed' | 'in-progress';
  environment?: Record<string, string>;
}

export interface FileOperationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface FileContentResponse {
  content: string;
  language: string;
}

export interface FileExplorerProps {
  onFileSelect?: (file: FileSystemItem) => void;
  onFileOpen?: (file: FileSystemItem) => void;
  onFileCreate?: (path: string, type: 'file' | 'folder') => void;
  onFileRename?: (oldPath: string, newName: string) => void;
  onFileDelete?: (path: string) => void;
  onFileMove?: (source: string, destination: string) => void;
  onFileCopy?: (source: string, destination: string) => void;
  onFileDownload?: (path: string) => void;
  onFileUpload?: (file: File, path: string) => void;
  onRefresh?: () => void;
  style?: React.CSSProperties;
  className?: string;
  showToolbar?: boolean;
  showContextMenu?: boolean;
  allowMultipleSelection?: boolean;
  defaultPath?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  icons?: {
    file?: React.ReactNode;
    folder?: React.ReactNode;
    folderOpen?: React.ReactNode;
    loading?: React.ReactNode;
    refresh?: React.ReactNode;
    newFile?: React.ReactNode;
    newFolder?: React.ReactNode;
    delete?: React.ReactNode;
    rename?: React.ReactNode;
    download?: React.ReactNode;
    upload?: React.ReactNode;
    cut?: React.ReactNode;
    copy?: React.ReactNode;
    paste?: React.ReactNode;
  };
}
