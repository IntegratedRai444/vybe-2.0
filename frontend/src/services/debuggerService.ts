import axios from 'axios';

const DEBUGGER_API_URL = 'http://localhost:5000/api/debug';

interface Breakpoint {
  id?: number;
  line: number;
  verified: boolean;
  condition?: string;
  hitCount?: number;
}

export const debuggerService = {
  // Debug session management
  async startDebugSession(filePath: string, language: string) {
    try {
      const response = await axios.post(`${DEBUGGER_API_URL}/start`, {
        file_path: filePath,
        language: language.toLowerCase(),
      });
      return response.data;
    } catch (error) {
      console.error('Error starting debug session:', error);
      throw error;
    }
  },

  async stopDebugSession(sessionId: string) {
    try {
      await axios.post(`${DEBUGGER_API_URL}/${sessionId}/stop`);
    } catch (error) {
      console.error('Error stopping debug session:', error);
      throw error;
    }
  },

  async getSessionStatus(sessionId: string) {
    try {
      const response = await axios.get(`${DEBUGGER_API_URL}/${sessionId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting debug session status:', error);
      throw error;
    }
  },

  // Breakpoints
  async setBreakpoints(sessionId: string, breakpoints: Breakpoint[]) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/breakpoints`,
        { breakpoints }
      );
      return response.data.breakpoints;
    } catch (error) {
      console.error('Error setting breakpoints:', error);
      throw error;
    }
  },

  // Execution control
  async continue(sessionId: string) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/continue`
      );
      return response.data;
    } catch (error) {
      console.error('Error continuing execution:', error);
      throw error;
    }
  },

  async stepOver(sessionId: string) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/step-over`
      );
      return response.data;
    } catch (error) {
      console.error('Error stepping over:', error);
      throw error;
    }
  },

  async stepInto(sessionId: string) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/step-into`
      );
      return response.data;
    } catch (error) {
      console.error('Error stepping into:', error);
      throw error;
    }
  },

  async stepOut(sessionId: string) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/step-out`
      );
      return response.data;
    } catch (error) {
      console.error('Error stepping out:', error);
      throw error;
    }
  },

  // Variables and stack
  async getVariables(sessionId: string, frameId?: number) {
    try {
      const url = frameId
        ? `${DEBUGGER_API_URL}/${sessionId}/variables?frameId=${frameId}`
        : `${DEBUGGER_API_URL}/${sessionId}/variables`;
      const response = await axios.get(url);
      return response.data.variables;
    } catch (error) {
      console.error('Error getting variables:', error);
      throw error;
    }
  },

  async getCallStack(sessionId: string) {
    try {
      const response = await axios.get(
        `${DEBUGGER_API_URL}/${sessionId}/call-stack`
      );
      return response.data.stackFrames;
    } catch (error) {
      console.error('Error getting call stack:', error);
      throw error;
    }
  },

  // Watch expressions
  async evaluateExpression(sessionId: string, expression: string) {
    try {
      const response = await axios.post(
        `${DEBUGGER_API_URL}/${sessionId}/evaluate`,
        { expression }
      );
      return response.data.result;
    } catch (error) {
      console.error('Error evaluating expression:', error);
      throw error;
    }
  },

  // Event handling
  async getEvents(sessionId: string, lastEventId?: number) {
    try {
      const url = lastEventId
        ? `${DEBUGGER_API_URL}/${sessionId}/events?lastEventId=${lastEventId}`
        : `${DEBUGGER_API_URL}/${sessionId}/events`;
      const response = await axios.get(url);
      return response.data.events;
    } catch (error) {
      console.error('Error getting debug events:', error);
      throw error;
    }
  },
};
