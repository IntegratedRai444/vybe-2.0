import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Store active collaboration sessions and clients
const collaborationSessions = new Map();
const clients = new Map();

export function setupCollaborationWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const sessionId = getSessionIdFromUrl(req.url) || `session-${uuidv4()}`;
    
    // Initialize client data
    clients.set(clientId, {
      ws,
      sessionId,
      cursorPosition: null,
      selection: null,
      username: `user-${clientId.slice(0, 6)}`,
      color: getRandomColor()
    });

    // Add client to session
    if (!collaborationSessions.has(sessionId)) {
      collaborationSessions.set(sessionId, new Set());
    }
    collaborationSessions.get(sessionId).add(clientId);

    console.log(`👥 Collaboration client connected: ${clientId} to session: ${sessionId}`);

    // Send welcome message with session info
    const welcomeMessage = {
      type: 'session_info',
      sessionId,
      clientId,
      users: getUsersInSession(sessionId, clientId)
    };
    ws.send(JSON.stringify(welcomeMessage));

    // Notify other clients in the session
    broadcastToSession(sessionId, clientId, {
      type: 'user_joined',
      clientId,
      username: clients.get(clientId).username,
      color: clients.get(clientId).color
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleCollaborationMessage(clientId, message);
      } catch (error) {
        console.error('Collaboration WebSocket error:', error);
        sendToClient(clientId, {
          type: 'error',
          message: error.message
        });
      }
    });

    ws.on('close', () => {
      console.log(`👋 Collaboration client disconnected: ${clientId}`);
      
      // Remove client from session
      const session = clients.get(clientId)?.sessionId;
      if (session && collaborationSessions.has(session)) {
        collaborationSessions.get(session).delete(clientId);
        
        // Clean up empty sessions
        if (collaborationSessions.get(session).size === 0) {
          collaborationSessions.delete(session);
        } else {
          // Notify other clients in the session
          broadcastToSession(session, clientId, {
            type: 'user_left',
            clientId,
            username: clients.get(clientId)?.username
          });
        }
      }
      
      // Remove client
      clients.delete(clientId);
    });
  });
}

function handleCollaborationMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { sessionId } = client;
  
  switch (message.type) {
    case 'cursor_move':
      // Update client's cursor position
      client.cursorPosition = message.position;
      // Broadcast to other clients in the session
      broadcastToSession(sessionId, clientId, {
        type: 'cursor_move',
        clientId,
        position: message.position,
        username: client.username,
        color: client.color
      });
      break;
      
    case 'selection_change':
      // Update client's selection
      client.selection = message.selection;
      // Broadcast to other clients in the session
      broadcastToSession(sessionId, clientId, {
        type: 'selection_change',
        clientId,
        selection: message.selection,
        username: client.username,
        color: client.color
      });
      break;
      
    case 'text_edit':
      // Broadcast text edits to other clients in the session
      broadcastToSession(sessionId, clientId, {
        type: 'text_edit',
        clientId,
        changes: message.changes,
        version: message.version
      });
      break;
      
    case 'chat_message':
      // Broadcast chat messages to all clients in the session
      broadcastToSession(sessionId, null, {
        type: 'chat_message',
        clientId,
        username: client.username,
        color: client.color,
        message: message.message,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'update_username':
      // Update client's username
      const oldUsername = client.username;
      client.username = message.username || client.username;
      // Notify all clients in the session
      broadcastToSession(sessionId, null, {
        type: 'user_updated',
        clientId,
        oldUsername,
        newUsername: client.username,
        color: client.color
      });
      break;
  }
}

// Helper function to get session ID from URL
function getSessionIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/[?&]session=([^&]*)/);
  return match ? match[1] : null;
}

// Helper function to get all users in a session (except the sender)
function getUsersInSession(sessionId, excludeClientId = null) {
  if (!collaborationSessions.has(sessionId)) return [];
  
  return Array.from(collaborationSessions.get(sessionId))
    .filter(clientId => clientId !== excludeClientId)
    .map(clientId => {
      const client = clients.get(clientId);
      return {
        clientId,
        username: client.username,
        color: client.color,
        cursorPosition: client.cursorPosition
      };
    });
}

// Helper function to broadcast to all clients in a session (except the sender)
function broadcastToSession(sessionId, excludeClientId, message) {
  if (!collaborationSessions.has(sessionId)) return;
  
  const messageStr = JSON.stringify(message);
  
  for (const clientId of collaborationSessions.get(sessionId)) {
    if (clientId !== excludeClientId) {
      const client = clients.get(clientId);
      if (client?.ws.readyState === 1) { // 1 = OPEN
        client.ws.send(messageStr);
      }
    }
  }
}

// Helper function to send a message to a specific client
function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client?.ws.readyState === 1) { // 1 = OPEN
    client.ws.send(JSON.stringify(message));
  }
}

// Helper function to generate a random color for a user
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A373', '#FAEDCD', '#F2CC8F', '#81B29A', '#F4F1DE',
    '#E07A5F', '#3D405B', '#F2CC8F', '#81B29A', '#F4F1DE'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

console.log('👥 Collaboration WebSocket handler initialized');
