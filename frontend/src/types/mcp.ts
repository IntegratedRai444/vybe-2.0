export type IssueSeverity = 'error' | 'warning' | 'info' | 'hint';
export type IssueCategory = 
  | 'syntax' 
  | 'type' 
  | 'security' 
  | 'style' 
  | 'performance' 
  | 'bug' 
  | 'complexity' 
  | 'import';

export interface CodeIssue {
  filePath: string;
  lineNumber: number;
  column?: number;
  severity: IssueSeverity;
  category: string;
  message: string;
  ruleId?: string;
  analyzer: string;
  codeSnippet?: string;
}

export interface IssueFix {
  issue: CodeIssue;
  analysis: string;
  fixCode: string;
  explanation: string;
  confidence: number;
}

export interface ScanRequest {
  projectPath: string;
  filePath?: string;
  languages?: string[];
  analyzers?: string[];
  scanType?: 'full' | 'incremental' | 'on-save';
}

export interface ScanResult {
  projectPath: string;
  filePath?: string;
  totalFiles: number;
  scannedFiles: number;
  totalIssues: number;
  issuesBySeverity: Record<IssueSeverity, number>;
  issuesByCategory: Record<string, number>;
  issues: CodeIssue[];
  scanTime: number;
  scanType: string;
  timestamp: number;
}

export interface FixRequest {
  projectPath: string;
  filePath?: string;
  issues?: CodeIssue[];
  autoApply: boolean;
  dryRun: boolean;
}

export interface FixResult {
  totalIssues: number;
  fixedIssues: number;
  failedFixes: number;
  fixes: IssueFix[];
  applied: boolean;
  errors: string[];
}

export interface ExplainRequest {
  issue: CodeIssue;
  includeExamples?: boolean;
}

export interface ExplainResult {
  issue: CodeIssue;
  explanation: string;
  examples?: string[];
  references?: string[];
}

export interface RealTimeScanConfig {
  enabled: boolean;
  debounceMs: number;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSizeMb: number;
}

export interface FileChangeEvent {
  eventType: 'created' | 'modified' | 'deleted' | 'moved';
  srcPath: string;
  destPath?: string;
  isDirectory: boolean;
  timestamp: number;
}

export interface MCPState {
  isConnected: boolean;
  isScanning: boolean;
  lastScanTime: number | null;
  issues: CodeIssue[];
  activeFile: string | null;
  config: {
    realTimeScan: RealTimeScanConfig;
  };
}
