export interface File {
  type: "file";
  name: string;
  path: string;
}

export interface Folder {
  type: "folder";
  name: string;
  path: string;
  children: (File | Folder)[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || `ws://${window.location.host}/api/ws`;

async function requestWithRetry(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
  delay = 1000,
): Promise<Response> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // For cookies/auth
    });

    // If unauthorized, try to refresh token or handle auth
    if (response.status === 401) {
      // TODO: Add token refresh logic here
      throw new Error("Unauthorized");
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return requestWithRetry(endpoint, options, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

async function request(
  endpoint: string,
  options: RequestInit = {},
  stream = false,
) {
  try {
    const response = await requestWithRetry(endpoint, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `API request failed: ${response.statusText} - ${errorBody}`,
      );
    }

    if (stream) {
      return response;
    }

    if (options.method === "DELETE") {
      return;
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Backend server is not running. Please start the backend server.",
      );
    }
    throw error;
  }
}

// ==================== FILE OPERATIONS ====================
export const getFileContent = (path: string) =>
  request(`/file/content?path=${encodeURIComponent(path)}`);
export const saveFile = (path: string, content: string) =>
  request("/file/save", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
export const createFile = (path: string, content: string = "") =>
  request("/file/create", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
export const createFolder = (path: string) =>
  request("/file/mkdir", { method: "POST", body: JSON.stringify({ path }) });

export function deleteFileOrFolder(path: string) {
  return request(`/fs/delete`, {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

export async function uploadFile(
  formData: FormData,
  onProgress?: (progressEvent: ProgressEvent<EventTarget>) => void,
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE_URL}/fs/upload`, true);
    xhr.withCredentials = true; // For cookies/auth

    if (onProgress) {
      xhr.upload.onprogress = onProgress;
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload"));
    };

    xhr.send(formData);
  });
}
export const renameFileOrFolder = (oldPath: string, newPath: string) =>
  request("/file/rename", {
    method: "POST",
    body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
  });

// ==================== PROJECT OPERATIONS ====================
export const indexProject = (root: string) =>
  request("/index", { method: "POST", body: JSON.stringify({ root }) });
export const listFiles = (root: string): Promise<Folder> =>
  request(`/files?root=${encodeURIComponent(root)}`);

// ==================== WEBSOCKET ====================
// WebSocket client is in websocket.ts
// Export WS_BASE_URL for WebSocket client
export { WS_BASE_URL };

// ==================== AI & CHAT ====================
export const generateCode = (
  prompt: string,
  filePath: string,
  model?: string,
) =>
  request("/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, file_path: filePath, model }),
  });
export const sendChatMessage = (
  message: string,
  root?: string,
  currentFile?: string,
  context?: string,
) =>
  request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, root, current_file: currentFile, context }),
  });

// ==================== SYSTEM STATUS ====================
export const checkHealth = () => request("/health");
export const checkProviders = () => request("/providers/status");
export const checkBackendConnection = () =>
  request("/health", { signal: AbortSignal.timeout(3000) });

// ==================== CODE OPERATIONS ====================
export const formatCode = (language: string, code: string, options?: any) =>
  request("/format", {
    method: "POST",
    body: JSON.stringify({ language, code, options }),
  });
export const lintFile = (filePath: string, projectRoot: string) =>
  request("/lint/file", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, project_root: projectRoot }),
  });
export const lintProject = (projectRoot: string) =>
  request("/lint/project", {
    method: "POST",
    body: JSON.stringify({ project_root: projectRoot }),
  });
export const getCodeCompletion = (
  code: string,
  cursorPos: number,
  filePath: string,
  language?: string,
) =>
  request("/complete", {
    method: "POST",
    body: JSON.stringify({
      code,
      cursor_pos: cursorPos,
      file_path: filePath,
      language,
    }),
  });
export const getHoverInfo = (
  code: string,
  cursorPos: number,
  filePath: string,
) =>
  request("/hover", {
    method: "POST",
    body: JSON.stringify({ code, cursor_pos: cursorPos, file_path: filePath }),
  });
export const getSignatureHelp = (
  code: string,
  cursorPos: number,
  filePath: string,
) =>
  request("/signature", {
    method: "POST",
    body: JSON.stringify({ code, cursor_pos: cursorPos, file_path: filePath }),
  });
export const findDefinition = (
  code: string,
  cursorPos: number,
  filePath: string,
) =>
  request("/definition", {
    method: "POST",
    body: JSON.stringify({ code, cursor_pos: cursorPos, file_path: filePath }),
  });
export const findReferences = (
  code: string,
  cursorPos: number,
  filePath: string,
) =>
  request("/references", {
    method: "POST",
    body: JSON.stringify({ code, cursor_pos: cursorPos, file_path: filePath }),
  });

// ==================== GIT OPERATIONS ====================
export const getGitStatus = (root: string) =>
  request(`/git/status?root=${encodeURIComponent(root)}`);
export const stageFiles = (root: string, paths: string[]) =>
  request("/git/stage", {
    method: "POST",
    body: JSON.stringify({ root, paths }),
  });
export const commit = (root: string, message: string) =>
  request("/git/commit", {
    method: "POST",
    body: JSON.stringify({ root, message }),
  });
export const getGitDiff = (root: string, path: string) =>
  request(
    `/git/diff?root=${encodeURIComponent(root)}&path=${encodeURIComponent(
      path,
    )}`,
  );
export const getGitBranches = (root: string) =>
  request(`/git/branches?root=${encodeURIComponent(root)}`);
export const checkoutBranch = (root: string, branch: string) =>
  request("/git/checkout", {
    method: "POST",
    body: JSON.stringify({ root, branch }),
  });

// ==================== FILE WATCHING ====================
export const startWatching = (path: string) =>
  request("/watch/start", { method: "POST", body: JSON.stringify({ path }) });
export const stopWatching = (path: string) =>
  request("/watch/stop", { method: "POST", body: JSON.stringify({ path }) });
export const getWatchStatus = () => request("/watch/status");

// ==================== ENHANCED GIT OPERATIONS ====================
export const getGitRepoInfo = (root: string) =>
  request(`/git/info?root=${encodeURIComponent(root)}`);
export const getCommitHistory = (
  root: string,
  limit: number = 50,
  branch?: string,
) => {
  const params = new URLSearchParams({ root, limit: limit.toString() });
  if (branch) params.append("branch", branch);
  return request(`/git/history?${params.toString()}`);
};
export const getDetailedBranches = (
  root: string,
  includeRemote: boolean = true,
) =>
  request(
    `/git/branches/detailed?root=${encodeURIComponent(
      root,
    )}&include_remote=${includeRemote}`,
  );
export const getFileBlame = (root: string, filePath: string) =>
  request(
    `/git/blame?root=${encodeURIComponent(root)}&file_path=${encodeURIComponent(
      filePath,
    )}`,
  );
export const getStashList = (root: string) =>
  request(`/git/stash?root=${encodeURIComponent(root)}`);
export const createStash = (
  root: string,
  message?: string,
  includeUntracked: boolean = false,
) =>
  request("/git/stash/create", {
    method: "POST",
    body: JSON.stringify({
      root,
      message,
      include_untracked: includeUntracked,
    }),
  });
export const applyStash = (root: string, stashName: string = "stash@{0}") =>
  request("/git/stash/apply", {
    method: "POST",
    body: JSON.stringify({ root, stash_name: stashName }),
  });
export const getMergeConflicts = (root: string) =>
  request(`/git/conflicts?root=${encodeURIComponent(root)}`);
export const resolveConflict = (
  root: string,
  filePath: string,
  resolution: "ours" | "theirs",
) =>
  request("/git/conflicts/resolve", {
    method: "POST",
    body: JSON.stringify({ root, file_path: filePath, resolution }),
  });

// ==================== DAP DEBUGGING ====================
export const createDAPSession = (
  language: string,
  program: string,
  args?: string[],
) =>
  request("/dap/session/create", {
    method: "POST",
    body: JSON.stringify({ language, program, args }),
  });
export const launchDAPSession = (sessionId: string) =>
  request(`/dap/session/${sessionId}/launch`, { method: "POST" });
export const attachDAPSession = (sessionId: string, port: number) =>
  request(`/dap/session/${sessionId}/attach`, {
    method: "POST",
    body: JSON.stringify({ port }),
  });
export const terminateDAPSession = (sessionId: string) =>
  request(`/dap/session/${sessionId}/terminate`, { method: "POST" });
export const listDAPSessions = () => request("/dap/sessions");
export const setDAPBreakpoints = (
  sessionId: string,
  filePath: string,
  breakpoints: Array<{ line: number; condition?: string; enabled?: boolean }>,
) =>
  request("/dap/breakpoints", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      file_path: filePath,
      breakpoints,
    }),
  });
export const continueDAPExecution = (sessionId: string, threadId?: number) =>
  request(`/dap/session/${sessionId}/continue`, {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId }),
  });
export const stepOverDAP = (sessionId: string, threadId?: number) =>
  request(`/dap/session/${sessionId}/step-over`, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, thread_id: threadId }),
  });
export const stepIntoDAP = (sessionId: string, threadId?: number) =>
  request(`/dap/session/${sessionId}/step-into`, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, thread_id: threadId }),
  });
export const stepOutDAP = (sessionId: string, threadId?: number) =>
  request(`/dap/session/${sessionId}/step-out`, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, thread_id: threadId }),
  });
export const pauseDAPExecution = (sessionId: string, threadId?: number) =>
  request(`/dap/session/${sessionId}/pause`, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, thread_id: threadId }),
  });
export const getDAPThreads = (sessionId: string) =>
  request(`/dap/session/${sessionId}/threads`);
export const getDAPStackTrace = (sessionId: string, threadId: number) =>
  request(`/dap/session/${sessionId}/stack-trace/${threadId}`);
export const getDAPVariables = (
  sessionId: string,
  variablesReference: number,
) => request(`/dap/session/${sessionId}/variables/${variablesReference}`);
export const evaluateDAPExpression = (
  sessionId: string,
  expression: string,
  frameId?: number,
) =>
  request(`/dap/session/${sessionId}/evaluate`, {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      expression,
      frame_id: frameId,
    }),
  });

// ==================== LEGACY DEBUGGING (Keep for compatibility) ====================
export const createDebugSession = (filePath: string, language?: string) =>
  request("/debug/session/create", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, language }),
  });
export const listDebugSessions = () => request("/debug/sessions");
export const getDebugSession = (sessionId: string) =>
  request(`/debug/session/${sessionId}`);
export const terminateDebugSession = (sessionId: string) =>
  request(`/debug/session/${sessionId}`, { method: "DELETE" });
export const setBreakpoint = (
  sessionId: string,
  line: number,
  condition?: string,
) =>
  request("/debug/breakpoint/set", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, line, condition }),
  });
export const removeBreakpoint = (sessionId: string, line: number) =>
  request("/debug/breakpoint/remove", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, line }),
  });
export const startDebugging = (sessionId: string) =>
  request("/debug/start", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const pauseDebugging = (sessionId: string) =>
  request("/debug/pause", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const resumeDebugging = (sessionId: string) =>
  request("/debug/resume", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const stepOver = (sessionId: string) =>
  request("/debug/step/over", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const stepInto = (sessionId: string) =>
  request("/debug/step/into", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const stepOut = (sessionId: string) =>
  request("/debug/step/out", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
export const getDebugVariables = (sessionId: string, scope: string = "local") =>
  request(`/debug/variables/${sessionId}?scope=${scope}`);
export const evaluateExpression = (sessionId: string, expression: string) =>
  request("/debug/evaluate", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, expression }),
  });

// ==================== SETTINGS ====================
export const getSettings = (workspacePath?: string) => {
  const params = workspacePath
    ? `?workspace_path=${encodeURIComponent(workspacePath)}`
    : "";
  return request(`/settings${params}`);
};
export const getSetting = (keyPath: string, workspacePath?: string) => {
  const params = workspacePath
    ? `?workspace_path=${encodeURIComponent(workspacePath)}`
    : "";
  return request(`/settings/${keyPath}${params}`);
};
export const updateSetting = (
  keyPath: string,
  value: any,
  scope: "user" | "workspace" = "user",
  workspacePath?: string,
) =>
  request("/settings/update", {
    method: "POST",
    body: JSON.stringify({
      key_path: keyPath,
      value,
      scope,
      workspace_path: workspacePath,
    }),
  });
export const resetSettings = (scope: "user" | "default" = "user") =>
  request("/settings/reset", {
    method: "POST",
    body: JSON.stringify({ scope }),
  });
export const exportSettings = (workspacePath?: string) => {
  const params = workspacePath
    ? `?workspace_path=${encodeURIComponent(workspacePath)}`
    : "";
  return request(`/settings/export${params}`);
};
export const importSettings = (settings: any, scope: "user" = "user") =>
  request("/settings/import", {
    method: "POST",
    body: JSON.stringify({ settings, scope }),
  });
export const getKeybindings = () => request("/keybindings");
export const updateKeybinding = (command: string, keybinding: string) =>
  request("/keybindings/update", {
    method: "POST",
    body: JSON.stringify({ command, keybinding }),
  });

// ==================== PROJECT SEARCH ====================
export const searchInFiles = (
  root: string,
  query: string,
  options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    includePattern?: string;
    excludePattern?: string;
  },
) =>
  request("/search/files", {
    method: "POST",
    body: JSON.stringify({ root, query, ...options }),
  });

export const replaceInFiles = (
  root: string,
  query: string,
  replacement: string,
  options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    includePattern?: string;
    excludePattern?: string;
  },
) =>
  request("/search/replace", {
    method: "POST",
    body: JSON.stringify({ root, query, replacement, ...options }),
  });

// ==================== MCP DEBUGGING SYSTEM ====================
export const debugProject = (root: string, autoFix: boolean = false) =>
  request("/mcp/debug", {
    method: "POST",
    body: JSON.stringify({ root, auto_fix: autoFix }),
  });
export const scanProject = (
  projectPath: string,
  languages?: string[],
  analyzers?: string[],
) =>
  request("/mcp/scan", {
    method: "POST",
    body: JSON.stringify({ project_path: projectPath, languages, analyzers }),
  });
export const fixIssues = (
  projectPath: string,
  issues?: any[],
  autoApply: boolean = false,
  dryRun: boolean = true,
) =>
  request("/mcp/fix", {
    method: "POST",
    body: JSON.stringify({
      project_path: projectPath,
      issues,
      auto_apply: autoApply,
      dry_run: dryRun,
    }),
  });
export const explainIssue = (issue: any, includeExamples: boolean = true) =>
  request("/mcp/explain", {
    method: "POST",
    body: JSON.stringify({ issue, include_examples: includeExamples }),
  });
export const getMCPHealth = () => request("/mcp/health");

// ==================== SECURITY & SANDBOX ====================
export const runSecurityScan = () => request("/security/scan/full");
export const scanVulnerabilities = (projectPath?: string) =>
  request("/security/scan/vulnerabilities", {
    method: "POST",
    body: JSON.stringify({ project_path: projectPath }),
  });
export const scanSecrets = (projectPath?: string, excludeDirs?: string[]) =>
  request("/security/scan/secrets", {
    method: "POST",
    body: JSON.stringify({
      project_path: projectPath,
      exclude_dirs: excludeDirs,
    }),
  });
export const executePythonSandbox = (
  code: string,
  timeout?: number,
  memoryLimit?: string,
) =>
  request("/sandbox/execute/python", {
    method: "POST",
    body: JSON.stringify({ code, timeout, memory_limit: memoryLimit }),
  });
export const executeJavaScriptSandbox = (code: string, timeout?: number) =>
  request("/sandbox/execute/javascript", {
    method: "POST",
    body: JSON.stringify({ code, timeout }),
  });
export const executeShellSandbox = (
  command: string,
  timeout?: number,
  allowedCommands?: string[],
) =>
  request("/sandbox/execute/shell", {
    method: "POST",
    body: JSON.stringify({
      command,
      timeout,
      allowed_commands: allowedCommands,
    }),
  });
export const getSandboxHealth = () => request("/sandbox/health");
export const getRemediationAdvice = (secretType: string) =>
  request(`/security/remediation/${secretType}`);

// ==================== LSP (Language Server Protocol) ====================
export const startLSPServer = (language: string, rootPath: string) =>
  request("/lsp/start", {
    method: "POST",
    body: JSON.stringify({ language, root_path: rootPath }),
  });

export const getLSPCompletions = (
  filePath: string,
  line: number,
  character: number,
  language: string,
) =>
  request("/lsp/completions", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, line, character, language }),
  });

export const getLSPHover = (
  filePath: string,
  line: number,
  character: number,
  language: string,
) =>
  request("/lsp/hover", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, line, character, language }),
  });

export const getLSPDefinition = (
  filePath: string,
  line: number,
  character: number,
  language: string,
) =>
  request("/lsp/definition", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, line, character, language }),
  });

export const getLSPReferences = (
  filePath: string,
  line: number,
  character: number,
  language: string,
) =>
  request("/lsp/references", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, line, character, language }),
  });

export const notifyLSPDocumentOpen = (
  filePath: string,
  content: string,
  language: string,
) =>
  request("/lsp/document/open", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, content, language }),
  });

export const notifyLSPDocumentChange = (
  filePath: string,
  content: string,
  language: string,
  version: number = 1,
) =>
  request("/lsp/document/change", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, content, language, version }),
  });

export const notifyLSPDocumentClose = (filePath: string, language: string) =>
  request("/lsp/document/close", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, language }),
  });

// ==================== CHAT PERSISTENCE ====================
export const fetchChatHistory = (sessionId: string) =>
  getChatMessages(sessionId);
export const createChatSession = (title: string, metadata?: any) =>
  request("/chat/session/create", {
    method: "POST",
    body: JSON.stringify({ title, metadata }),
  });
export const addChatMessage = (
  sessionId: string,
  role: string,
  content: string,
  metadata?: any,
) =>
  request("/chat/message/add", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, role, content, metadata }),
  });
export const getChatSession = (sessionId: string) =>
  request(`/chat/session/${sessionId}`);
export const getChatMessages = (
  sessionId: string,
  limit?: number,
  offset?: number,
) => {
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
export const updateChatSession = (
  sessionId: string,
  title?: string,
  metadata?: any,
) =>
  request(`/chat/session/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify({ title, metadata }),
  });
export const deleteChatSession = (sessionId: string) =>
  request(`/chat/session/${sessionId}`, { method: "DELETE" });
export const deleteChatMessage = (messageId: number) =>
  request(`/chat/message/${messageId}`, { method: "DELETE" });
export const searchChatMessages = (query: string, limit?: number) => {
  const params = new URLSearchParams({ query });
  if (limit) params.append("limit", limit.toString());
  return request(`/chat/search?${params.toString()}`);
};
export const exportChatSession = (
  sessionId: string,
  format: "json" | "markdown" = "json",
) => request(`/chat/session/${sessionId}/export?format=${format}`);
export const getChatStats = () => request("/chat/stats");
