import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import path from 'path';

// Store active terminal sessions and clients
const terminals = new Map();
const clients = new Map();

// Mock terminal implementation
class MockTerminal {
  constructor(options = {}) {
    this.id = uuidv4();
    this.rows = options.rows || 24;
    this.cols = options.cols || 80;
    this.cwd = options.cwd || process.cwd();
    this.env = { ...process.env, ...options.env };
    this.shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    this.buffer = '';
    this.clients = new Set();
    this.prompt = `${this.cwd} $ `;
    this.history = [];
    this.historyIndex = -1;
    this.commands = [
      'ls', 'dir', 'cd', 'pwd', 'echo', 'clear', 'help', 'date', 'whoami',
      'git', 'npm', 'node', 'python', 'python3', 'python2', 'java', 'javac'
    ];

    // Initial welcome message
    this.write(`\x1b[1;32mWelcome to Mock Terminal (${this.id})\x1b[0m\r\n`);
    this.write(`\x1b[1;34mType 'help' for available commands\x1b[0m\r\n\r\n`);
    this.write(this.prompt);
  }

  write(data) {
    this.buffer += data;
    this.broadcast({
      type: 'data',
      data: data
    });
  }

  input(data) {
    // Handle special keys
    if (data === '\r') {  // Enter key
      const command = this.buffer.split('\n').pop().replace(this.prompt, '').trim();
      this.history.push(command);
      this.historyIndex = this.history.length;
      this.write('\r\n');
      this.handleCommand(command);
      this.prompt = `${this.cwd} $ `;
      this.write(this.prompt);
    } else if (data === '\x7f') {  // Backspace
      if (this.buffer.endsWith(this.prompt)) return;
      this.buffer = this.buffer.slice(0, -1);
      this.broadcast({
        type: 'data',
        data: '\b \b'
      });
    } else if (data.startsWith('\x1b[')) {
      // Handle arrow keys (simplified)
      if (data === '\x1b[A') {  // Up arrow
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.clearLine();
          const cmd = this.history[this.historyIndex];
          this.write(cmd);
        }
      } else if (data === '\x1b[B') {  // Down arrow
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.clearLine();
          const cmd = this.history[this.historyIndex];
          this.write(cmd);
        } else if (this.historyIndex === this.history.length - 1) {
          this.historyIndex++;
          this.clearLine();
        }
      } else if (data === '\x1b[C') {  // Right arrow
        this.write('\x1b[C');
      } else if (data === '\x1b[D') {  // Left arrow
        this.write('\x1b[D');
      }
    } else if (data.charCodeAt(0) >= 32) {  // Printable characters
      this.buffer += data;
      this.broadcast({
        type: 'data',
        data: data
      });
    }
  }

  clearLine() {
    // Clear current line and move cursor to beginning
    this.broadcast({
      type: 'data',
      data: '\r\x1b[K'
    });
    // Rewrite prompt
    this.broadcast({
      type: 'data',
      data: this.prompt
    });
  }

  async handleCommand(command) {
    if (!command) return;

    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case 'clear':
        this.broadcast({ type: 'clear' });
        this.buffer = '';
        break;

      case 'help':
        this.write('\x1b[1mAvailable commands:\x1b[0m\r\n');
        this.write('  ls, dir - List directory contents\r\n');
        this.write('  cd <dir> - Change directory\r\n');
        this.write('  pwd - Print working directory\r\n');
        this.write('  echo <text> - Print text\r\n');
        this.write('  clear - Clear the terminal\r\n');
        this.write('  help - Show this help message\r\n');
        this.write('  exit - Close the terminal\r\n');
        break;

      case 'ls':
      case 'dir':
        this.write('mock_file1.txt\r\n');
        this.write('mock_directory/\r\n');
        this.write('package.json\r\n');
        break;

      case 'cd':
        const dir = args[0] || os.homedir();
        this.cwd = path.resolve(this.cwd, dir);
        this.write(`Changed directory to ${this.cwd}\r\n`);
        break;

      case 'pwd':
        this.write(`${this.cwd}\r\n`);
        break;

      case 'echo':
        this.write(`${args.join(' ')}\r\n`);
        break;

      case 'exit':
        this.broadcast({ type: 'close' });
        break;

      default:
        // Simulate command execution
        this.write(`\x1b[33mExecuting: ${command}\x1b[0m\r\n`);

        // Mock execution delay
        await new Promise(resolve => setTimeout(resolve, 300));

        if (Math.random() > 0.2) {
          this.write(`Command '${cmd}' completed successfully\r\n`);
        } else {
          this.write(`\x1b[31mCommand '${cmd}' not found\x1b[0m\r\n`);
        }
    }
  }

  resize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.broadcast({
      type: 'resize',
      rows,
      cols
    });
  }

  addClient(clientId, ws) {
    this.clients.add(clientId);

    // Send initial data to the new client
    ws.send(JSON.stringify({
      type: 'init',
      id: this.id,
      rows: this.rows,
      cols: this.cols
    }));

    // Send existing buffer
    if (this.buffer) {
      ws.send(JSON.stringify({
        type: 'data',
        data: this.buffer
      }));
    }
  }

  removeClient(clientId) {
    this.clients.delete(clientId);
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    for (const clientId of this.clients) {
      const client = clients.get(clientId);
      if (client?.ws.readyState === 1) { // 1 = OPEN
        client.ws.send(messageStr);
      }
    }
  }
}

export function setupTerminalWebSocket(ws, req) {
  try {
    const clientId = uuidv4();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const terminalId = url.searchParams.get('id') || uuidv4();

    console.log(`New terminal connection: clientId=${clientId}, terminalId=${terminalId}`);

    // Initialize client
    const client = {
      ws,
      terminalId,
      lastActivity: Date.now()
    };

    clients.set(clientId, client);

    // Handle WebSocket close
    const handleClose = () => {
      console.log(`Terminal client disconnected: ${clientId}`);
      clients.delete(clientId);

      const terminal = terminals.get(terminalId);
      if (terminal) {
        terminal.removeClient(clientId);
      }
    };

    // Handle WebSocket errors
    const handleError = (error) => {
      console.error(`Terminal WebSocket error for client ${clientId}:`, error);
      ws.close(1011, 'Internal server error');
    };

    // Set up event handlers
    ws.on('error', handleError);
    ws.on('close', handleClose);

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        client.lastActivity = Date.now();
        const message = JSON.parse(data);

        let terminal = terminals.get(terminalId);

        // Create new terminal if it doesn't exist
        if (!terminal && message.type === 'create') {
          terminal = new MockTerminal({
            cwd: message.cwd || process.cwd(),
            shell: message.shell || (process.platform === 'win32' ? 'powershell.exe' : 'bash'),
            rows: message.rows || 24,
            cols: message.cols || 80,
            env: message.env || {}
          });
          terminals.set(terminalId, terminal);
          console.log(`Created new terminal: ${terminalId}`);
        }

        if (!terminal) {
          throw new Error('Terminal not initialized');
        }

        // Add client to terminal
        if (!terminal.clients.has(clientId)) {
          terminal.addClient(clientId, ws);
        }

        // Handle different message types
        switch (message.type) {
          case 'input':
            terminal.input(message.data);
            break;

          case 'resize':
            terminal.resize(message.rows, message.cols);
            break;

          case 'heartbeat':
            // Just update last activity
            break;

          default:
            console.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error handling terminal message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      terminalId,
      clientId
    }));

  } catch (error) {
    console.error('Error in terminal WebSocket setup:', error);
    if (ws.readyState === ws.OPEN) {
      ws.close(1011, 'Internal server error');
    }
  }
}

    // Add client to terminal
    terminal.addClient(clientId);

    console.log(`🔌 Terminal client connected: ${clientId} to terminal: ${terminalId}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Terminal WebSocket connected',
      terminalId: terminal.id
    }));

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'input':
            terminal.input(message.data);
            break;

          case 'resize':
            terminal.resize(message.rows, message.cols);
            break;

          case 'heartbeat':
            // Just acknowledge the heartbeat
            ws.send(JSON.stringify({ type: 'heartbeat' }));
            break;
        }
      } catch (error) {
        console.error('Terminal WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      console.log(`🔌 Terminal client disconnected: ${clientId}`);

      // Remove client from terminal
      if (terminal) {
        terminal.removeClient(clientId);
      }

      // Remove client
      clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('Terminal WebSocket error:', error);
      ws.close();
    });
  } catch (error) {
    console.error('Error setting up terminal WebSocket:', error);
    ws.close(1011, 'Internal server error');
  }
