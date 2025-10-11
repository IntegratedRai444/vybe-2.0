export interface File {
  type: 'file';
  name: string;
  path: string;
}

export interface Folder {
  type: 'folder';
  name: string;
  path: string;
  children: (File | Folder)[];
}

const API_BASE_URL = "http://127.0.0.1:8000";

async function request(endpoint: string, options: RequestInit = {}, stream = false) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.statusText} - ${errorBody}`);
  }

  if (stream) {
    return response;
  }

  if (options.method === 'DELETE') {
    return;
  }
  
  return response.json();
}

// File Operations
export const saveFile = (path: string, content: string) => request("/file/save", { method: "POST", body: JSON.stringify({ path, content }) });
export const createFile = (path: string, content: string = "") => request("/file/create", { method: "POST", body: JSON.stringify({ path, content }) });
export const createFolder = (path: string) => request("/folder/create", { method: "POST", body: JSON.stringify({ path }) });
export const deleteFileOrFolder = (path: string) => request(`/file/delete?path=${encodeURIComponent(path)}`, { method: "DELETE" });
export const renameFileOrFolder = (oldPath: string, newPath: string) => request("/file/rename", { method: "POST", body: JSON.stringify({ old_path: oldPath, new_path: newPath }) });

// Project and File Tree
export const indexProject = (root: string) => request("/index", { method: "POST", body: JSON.stringify({ root }) });
export const listFiles = (root: string): Promise<Folder> => request(`/files?root=${encodeURIComponent(root)}`);
export const getFileContent = (path: string) => request(`/file/content?path=${encodeURIComponent(path)}`);

// Other Endpoints
export const checkBackendConnection = () => request("/files?root=/", { signal: AbortSignal.timeout(3000) });
export const lintFile = (path: string, root: string) => request(`/lint?path=${encodeURIComponent(path)}&root=${encodeURIComponent(root)}`);
export const lintProject = (root: string) => request(`/lint/project?root=${encodeURIComponent(root)}`);

// Code Formatting
export const formatCode = (language: string, code: string, options?: any) => 
  request("/format", { 
    method: "POST", 
    body: JSON.stringify({ language, code, options }) 
  });

// Chat
export const sendChatMessage = (prompt: string, root: string, currentFile: string) => request("/chat", { method: "POST", body: JSON.stringify({ message: prompt, root, current_file: currentFile }) }, true);

// Git
export const getGitStatus = (root: string) => request(`/git/status?root=${encodeURIComponent(root)}`);
export const stageFiles = (root: string, paths: string[]) => request("/git/stage", { method: "POST", body: JSON.stringify({ root, paths }) });
export const commit = (root: string, message: string) => request("/git/commit", { method: "POST", body: JSON.stringify({ root, message }) });
export const getGitDiff = (root: string, path: string) => request(`/git/diff?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}`);
export const getGitBranches = (root: string) => request(`/git/branches?root=${encodeURIComponent(root)}`);
export const checkoutBranch = (root: string, branch: string) => request("/git/checkout", { method: "POST", body: JSON.stringify({ root, branch }) });

// Completions
export const getCodeCompletion = (code: string, cursorPos: number, filePath: string) => request("/complete", { method: "POST", body: JSON.stringify({ code, cursor_pos: cursorPos, file_path: filePath }) });

// MCP Debugging System
export const debugProject = (root: string, autoFix: boolean = false) => request("/mcp/debug", { method: "POST", body: JSON.stringify({ root, auto_fix: autoFix }) });
export const scanProject = (projectPath: string, languages?: string[], analyzers?: string[]) => request("/mcp/scan", { method: "POST", body: JSON.stringify({ project_path: projectPath, languages, analyzers }) });
export const fixIssues = (projectPath: string, issues?: any[], autoApply: boolean = false, dryRun: boolean = true) => request("/mcp/fix", { method: "POST", body: JSON.stringify({ project_path: projectPath, issues, auto_apply: autoApply, dry_run: dryRun }) });
export const explainIssue = (issue: any, includeExamples: boolean = true) => request("/mcp/explain", { method: "POST", body: JSON.stringify({ issue, include_examples: includeExamples }) });
export const getMCPHealth = () => request("/mcp/health");

// Security & Sandbox
export const runSecurityScan = () => request("/security/scan/full");
export const scanVulnerabilities = (projectPath?: string) => request("/security/scan/vulnerabilities", { method: "POST", body: JSON.stringify({ project_path: projectPath }) });
export const scanSecrets = (projectPath?: string, excludeDirs?: string[]) => request("/security/scan/secrets", { method: "POST", body: JSON.stringify({ project_path: projectPath, exclude_dirs: excludeDirs }) });
export const executePythonSandbox = (code: string, timeout?: number, memoryLimit?: string) => request("/sandbox/execute/python", { method: "POST", body: JSON.stringify({ code, timeout, memory_limit: memoryLimit }) });
export const executeJavaScriptSandbox = (code: string, timeout?: number) => request("/sandbox/execute/javascript", { method: "POST", body: JSON.stringify({ code, timeout }) });
export const executeShellSandbox = (command: string, timeout?: number, allowedCommands?: string[]) => request("/sandbox/execute/shell", { method: "POST", body: JSON.stringify({ command, timeout, allowed_commands: allowedCommands }) });
export const getSandboxHealth = () => request("/sandbox/health");
export const getRemediationAdvice = (secretType: string) => request(`/security/remediation/${secretType}`);

// ==================== Chat Persistence API ====================

export const fetchChatHistory = (sessionId: string) => getChatMessages(sessionId);
export const createChatSession = (title: string, metadata?: any) => request("/chat/session/create", { method: "POST", body: JSON.stringify({ title, metadata }) });
export const addChatMessage = (sessionId: string, role: string, content: string, metadata?: any) => request("/chat/message/add", { method: "POST", body: JSON.stringify({ session_id: sessionId, role, content, metadata }) });
export const getChatSession = (sessionId: string) => request(`/chat/session/${sessionId}`);
export const getChatMessages = (sessionId: string, limit?: number, offset?: number) => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  return request(`/chat/session/${sessionId}/messages?${params.toString()}`);
};
export const getChatSessions = (limit?: number, offset?: number) => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  return request(`/chat/sessions?${params.toString()}`);
};
export const updateChatSession = (sessionId: string, title?: string, metadata?: any) => request(`/chat/session/${sessionId}`, { method: "PUT", body: JSON.stringify({ title, metadata }) });
export const deleteChatSession = (sessionId: string) => request(`/chat/session/${sessionId}`, { method: "DELETE" });
export const deleteChatMessage = (messageId: number) => request(`/chat/message/${messageId}`, { method: "DELETE" });
export const searchChatMessages = (query: string, limit?: number) => {
  const params = new URLSearchParams({ query });
  if (limit) params.append("limit", limit.toString());
  return request(`/chat/search?${params.toString()}`);
};
export const exportChatSession = (sessionId: string, format: 'json' | 'markdown' = 'json') => request(`/chat/session/${sessionId}/export?format=${format}`);
export const getChatStats = () => request("/chat/stats");
