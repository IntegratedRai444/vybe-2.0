import { spawn } from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import path from 'path';

// Store active terminal sessions and clients
const terminals = new Map();
const clients = new Map();

// Default terminal themes
const defaultThemes = {
  'default-dark': {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#93a1a1',
    cursor: '#93a1a1',
    cursorAccent: '#002b36',
    selection: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#859900',
    brightYellow: '#b58900',
    brightBlue: '#268bd2',
    brightMagenta: '#6c71c4',
    brightCyan: '#2aa198',
    brightWhite: '#fdf6e3'
  }
};

export function setupTerminalWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    clients.set(clientId, {
      ws,
      sessions: new Set(),
      preferences: {
        theme: 'default-dark',
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000
      }
    });
    
    console.log(`🔌 Terminal client connected: ${clientId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleTerminalMessage(ws, clientId, message);
      } catch (error) {
        console.error('Terminal WebSocket error:', error);
        sendToClient(clientId, {
          type: 'error',
          message: error.message
        });
      }
    });

    ws.on('close', () => {
      console.log(`🔌 Terminal client disconnected: ${clientId}`);
      
      // Clean up all terminals for this client
      const client = clients.get(clientId);
      if (client) {
        client.sessions.forEach(terminalId => {
          const terminal = terminals.get(terminalId);
          if (terminal) {
            terminal.pty.kill();
            terminals.delete(terminalId);
          }
        });
      }
      
      clients.delete(clientId);
    });

    // Send welcome message with available themes and settings
    sendToClient(clientId, {
      type: 'connected',
      clientId,
      message: 'Terminal WebSocket connected',
      themes: Object.keys(defaultThemes),
      preferences: clients.get(clientId).preferences
    });
  });
}

async function handleTerminalMessage(ws, clientId, message) {
  const { type, terminalId, data } = message;
  const client = clients.get(clientId);

  if (!client) {
    return;
  }

  switch (type) {
    case 'create':
      await createTerminal(ws, clientId, message);
      break;

    case 'input':
      await handleTerminalInput(ws, terminalId, data);
      break;

    case 'resize':
      await resizeTerminal(ws, terminalId, data);
      break;

    case 'kill':
      await killTerminal(ws, terminalId);
      break;

    case 'list':
      await listTerminals(ws, clientId);
      break;
      
    case 'update_preferences':
      // Update client preferences
      if (message.preferences) {
        client.preferences = {
          ...client.preferences,
          ...message.preferences
        };
        
        // Apply theme to all active terminals
        if (message.preferences.theme) {
          client.sessions.forEach(termId => {
            const term = terminals.get(termId);
            if (term) {
              term.theme = defaultThemes[message.preferences.theme] || defaultThemes['default-dark'];
              sendToClient(clientId, {
                type: 'terminal_updated',
                terminalId: termId,
                updates: { theme: term.theme }
              });
            }
          });
        }
        
        sendToClient(clientId, {
          type: 'preferences_updated',
          preferences: client.preferences
        });
      }
      break;
      
    case 'rename_terminal':
      if (terminalId && message.name) {
        const term = terminals.get(terminalId);
        if (term && term.clientId === clientId) {
          term.name = message.name;
          sendToClient(clientId, {
            type: 'terminal_updated',
            terminalId,
            updates: { name: message.name }
          });
        }
      }
      break;
      
    case 'get_sessions':
      const sessions = Array.from(client.sessions)
        .map(id => terminals.get(id))
        .filter(Boolean)
        .map(getSessionInfo);
        
      sendToClient(clientId, {
        type: 'sessions_list',
        sessions
      });
      break;

    default:
      sendToClient(clientId, {
        type: 'error',
        message: `Unknown message type: ${type}`
      });
  }
}

// Helper function to send messages to client
function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(message));
  }
}

// Helper function to broadcast to all clients
function broadcast(message) {
  clients.forEach(client => {
    if (client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

async function createTerminal(ws, clientId, options) {
  const terminalId = options.terminalId || uuidv4();
  const client = clients.get(clientId);
  
  if (!client) {
    throw new Error('Client not found');
  }

  const { 
    shell = getDefaultShell(),
    cwd = process.cwd(),
    env = {},
    cols = 80,
    rows = 24,
    theme = 'default-dark',
    name = `Terminal-${Date.now()}`
  } = options;

  // Add client preferences to env
  const terminalEnv = {
    ...process.env,
    ...env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'vybe-ide',
    TERM_PROGRAM_VERSION: '1.0.0'
  };

  try {
    // Validate and resolve working directory
    const workingDir = path.resolve(cwd);
    
    // Create PTY process
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd: workingDir,
      env: terminalEnv
    });

    // Create terminal session
    const session = {
      id: terminalId,
      pty,
      clientId,
      shell,
      cwd: workingDir,
      name,
      theme: defaultThemes[theme] || defaultThemes['default-dark'],
      env: terminalEnv,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
      cols,
      rows,
      title: name
    };

    // Store terminal session
    terminals.set(terminalId, session);
    client.sessions.add(terminalId);

    // Handle PTY output
    pty.onData((data) => {
      const client = clients.get(clientId);
      if (client) {
        sendToClient(clientId, {
          type: 'output',
          terminalId,
          data
        });
      }
    });

    // Handle title changes
    pty.on('title', (title) => {
      const session = terminals.get(terminalId);
      if (session) {
        session.title = title;
        sendToClient(clientId, {
          type: 'title',
          terminalId,
          title
        });
      }
    });

    // Handle PTY exit
    pty.onExit(({ exitCode, signal }) => {
      console.log(`Terminal ${terminalId} exited with code ${exitCode}, signal ${signal}`);
      
      const session = terminals.get(terminalId);
      if (session) {
        session.status = 'terminated';
        session.lastActivity = new Date();
        
        sendToClient(clientId, {
          type: 'exit',
          terminalId,
          exitCode,
          signal,
          session: getSessionInfo(session)
        });
      }
    });

    // Send success response with session info
    sendToClient(clientId, {
      type: 'created',
      terminalId,
      session: getSessionInfo(session)
    });
    
    // Notify other clients about the new terminal
    broadcast({
      type: 'terminal_created',
      clientId,
      session: getSessionInfo(session)
    });

    console.log(`✅ Terminal created: ${terminalId} (${shell} in ${workingDir})`);

  } catch (error) {
    console.error('Error creating terminal:', error);
    sendToClient(clientId, {
      type: 'error',
      message: `Failed to create terminal: ${error.message}`
    });
  }
}

async function handleTerminalInput(ws, terminalId, data) {
  const terminal = terminals.get(terminalId);
  
  if (!terminal) {
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Terminal ${terminalId} not found`
    });
    return;
  }

  try {
    terminal.pty.write(data);
    terminal.lastActivity = new Date();
  } catch (error) {
    console.error('Error writing to terminal:', error);
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Failed to write to terminal: ${error.message}`
    });
  }
}

async function resizeTerminal(ws, terminalId, { cols, rows }) {
  const terminal = terminals.get(terminalId);
  
  if (!terminal) {
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Terminal ${terminalId} not found`
    });
    return;
  }

  try {
    terminal.pty.resize(cols, rows);
    
    sendToClient(terminal.clientId, {
      type: 'resized',
      terminalId,
      cols,
      rows
    });
  } catch (error) {
    console.error('Error resizing terminal:', error);
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Failed to resize terminal: ${error.message}`
    });
  }
}

async function killTerminal(ws, terminalId) {
  const terminal = terminals.get(terminalId);
  
  if (!terminal) {
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Terminal ${terminalId} not found`
    });
    return;
  }

  try {
    terminal.pty.kill();
    terminals.delete(terminalId);
    
    sendToClient(terminal.clientId, {
      type: 'killed',
      terminalId
    });

    console.log(`🗑️ Terminal killed: ${terminalId}`);
  } catch (error) {
    console.error('Error killing terminal:', error);
    sendToClient(terminal.clientId, {
      type: 'error',
      message: `Failed to kill terminal: ${error.message}`
    });
  }
}

async function listTerminals(ws, clientId) {
  const clientTerminals = [];
  
  for (const [terminalId, terminal] of terminals.entries()) {
    if (terminal.clientId === clientId) {
      clientTerminals.push({
        id: terminalId,
        shell: terminal.shell,
        cwd: terminal.cwd,
        created: terminal.created,
        lastActivity: terminal.lastActivity
      });
    }
  }

  sendToClient(clientId, {
    type: 'list',
    terminals: clientTerminals
  });
}

function getDefaultShell() {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return process.env.COMSPEC || 'cmd.exe';
    case 'darwin':
      return process.env.SHELL || '/bin/zsh';
    default:
      return process.env.SHELL || '/bin/bash';
  }
}

// Helper function to get session info
function getSessionInfo(session) {
  return {
    id: session.id,
    name: session.name,
    title: session.title,
    shell: session.shell,
    cwd: session.cwd,
    theme: session.theme,
    status: session.status,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    cols: session.cols,
    rows: session.rows
  };
}

// Cleanup inactive terminals
setInterval(() => {
  const now = new Date();
  const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

  for (const [terminalId, terminal] of terminals.entries()) {
    if (now - terminal.lastActivity > maxInactiveTime) {
      console.log(`Terminal ${terminalId} inactive, terminating`);
      if (terminal.pty) {
        terminal.pty.kill();
      }
      
      // Remove from client's session list
      const client = clients.get(terminal.clientId);
      if (client) {
        client.sessions.delete(terminalId);
      }
      
      terminals.delete(terminalId);
      
      // Notify clients
      broadcast({
        type: 'terminal_terminated',
        terminalId,
        reason: 'inactive'
      });
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes