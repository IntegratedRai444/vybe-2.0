// AI Endpoints
export const AI_ENDPOINTS = {
  CHAT: '/ai/chat',
  CODE_ANALYSIS: '/ai/analyze',
  PROVIDERS: '/ai/providers',  
  CONFIGURE_PROVIDER: '/ai/configure-provider',
} as const;

// Debugger Endpoints
export const DEBUGGER_ENDPOINTS = {
  BASE: '/debug',
  SESSION: (sessionId: string) => `/debug/${sessionId}`,
  BREAKPOINTS: (sessionId: string) => `/debug/${sessionId}/breakpoints`,
  CONTINUE: (sessionId: string) => `/debug/${sessionId}/continue`,
  STEP_OVER: (sessionId: string) => `/debug/${sessionId}/step-over`,
  STEP_INTO: (sessionId: string) => `/debug/${sessionId}/step-into`,
  STEP_OUT: (sessionId: string) => `/debug/${sessionId}/step-out`,
  VARIABLES: (sessionId: string) => `/debug/${sessionId}/variables`,
  CALL_STACK: (sessionId: string) => `/debug/${sessionId}/callstack`,
  EVALUATE: (sessionId: string) => `/debug/${sessionId}/evaluate`,
  EVENTS: (sessionId: string) => `/debug/${sessionId}/events`,
} as const;

// Git Endpoints
export const GIT_ENDPOINTS = {
  STATUS: '/git/status',
  COMMIT: '/git/commit',
  PUSH: '/git/push',
  PULL: '/git/pull',
  BRANCH: '/git/branch',
  LOG: '/git/log',
} as const;

// Authentication Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
} as const;

// Editor Endpoints
export const EDITOR_ENDPOINTS = {
  FILES: '/files',
  FILE_CONTENT: (filePath: string) => `/files/${encodeURIComponent(filePath)}`,
  SAVE: '/files/save',
  DELETE: (filePath: string) => `/files/${encodeURIComponent(filePath)}`,
} as const;
