import React, { useState, useEffect, useRef } from 'react';
import { FaUsers, FaPlay, FaStop, FaCog } from 'react-icons/fa';

type User = {
  id: string;
  name: string;
  color: string;
  cursor_position?: { line: number; column: number };
  selection?: { start: number; end: number };
};

type CollaborationSession = {
  session_id: string;
  file_path: string;
  users: User[];
  version: number;
  created_at: string;
  last_activity: string;
  operation_count: number;
};

type Props = {
  projectRoot: string;
  currentOpenFile: string | null;
  onCollaborationStart: (sessionId: string, userId: string) => void;
  onCollaborationStop: () => void;
};

export const CollaborationPanel: React.FC<Props> = ({
  currentOpenFile,
  onCollaborationStart,
  onCollaborationStop,
}) => {
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [activeSession, setActiveSession] = useState<CollaborationSession | null>(null);
  const [userName, setUserName] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<User[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadSessions();
    // Load saved username
    const savedName = localStorage.getItem('collaboration_user_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/collaboration/sessions');
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createOrJoinSession = async () => {
    if (!currentOpenFile || !userName.trim()) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/collaboration/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: currentOpenFile,
          user_name: userName,
        }),
      });

      const data = await response.json();
      
      // Save username
      localStorage.setItem('collaboration_user_name', userName);
      
      // Connect to WebSocket
      await connectWebSocket(data.session_id, data.user_id);
      
      setActiveSession({
        session_id: data.session_id,
        file_path: data.file_path,
        users: data.active_users,
        version: 0,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        operation_count: 0,
      });
      
      setCurrentUser({
        id: data.user_id,
        name: data.user_name,
        color: data.user_color,
      });
      
      onCollaborationStart(data.session_id, data.user_id);
      setShowJoinDialog(false);
      setIsConnected(true);
      
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const connectWebSocket = async (sessionId: string, userId: string) => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/collaboration/ws/${sessionId}/${userId}`);
    
    ws.onopen = () => {
      console.log('Collaboration WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'sync':
          // Initial sync - update users list
          setPresenceUsers(message.users);
          break;
          
        case 'user_joined':
          setPresenceUsers(prev => [...prev, message.user]);
          break;
          
        case 'user_left':
          setPresenceUsers(prev => prev.filter(u => u.id !== message.user_id));
          break;
          
        case 'edit':
          // Handle collaborative edit
          console.log('Received edit:', message);
          break;
          
        case 'cursor':
          // Update user cursor position
          setPresenceUsers(prev => 
            prev.map(u => u.id === message.user.id ? message.user : u)
          );
          break;
      }
    };

    ws.onclose = () => {
      console.log('Collaboration WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const leaveSession = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (activeSession) {
      try {
        await fetch(`http://127.0.0.1:8000/collaboration/session/${activeSession.session_id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }

    setActiveSession(null);
    setCurrentUser(null);
    setPresenceUsers([]);
    setIsConnected(false);
    onCollaborationStop();
  };

  // Removed unused functions

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <FaUsers className="w-4 h-4 text-blue-400" />
          <span className="font-medium">Collaboration</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-white"
            title="Settings"
          >
            <FaCog className="w-4 h-4" />
          </button>
          {isConnected ? (
            <button
              onClick={leaveSession}
              className="p-1 text-red-400 hover:text-red-300"
              title="Leave Session"
            >
              <FaStop className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowJoinDialog(true)}
              className="p-1 text-green-400 hover:text-green-300"
              title="Start Collaboration"
            >
              <FaPlay className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Active Session */}
        {activeSession && (
          <div className="space-y-3">
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">Active Session</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              </div>
              <p className="text-xs text-gray-300 truncate">{activeSession.file_path}</p>
              <p className="text-xs text-gray-400">
                {presenceUsers.length} user{presenceUsers.length !== 1 ? 's' : ''} online
              </p>
            </div>

            {/* Active Users */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Online Users</h4>
              <div className="space-y-2">
                {presenceUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    ></div>
                    <span className="text-sm text-white">{user.name}</span>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-blue-400">(You)</span>
                    )}
                    {user.cursor_position && (
                      <span className="text-xs text-gray-400 ml-auto">
                        L{user.cursor_position.line}:C{user.cursor_position.column}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Available Sessions */}
        {!activeSession && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Available Sessions</h4>
            {sessions.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">No active sessions</p>
                <p className="text-xs mt-1">Start collaboration on a file to create a session</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {session.file_path}
                      </span>
                      <span className="text-xs text-gray-400">
                        {session.users.length} user{session.users.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(session.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Operations: {session.operation_count}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Collaboration Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Show Cursor Positions</label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Display other users' cursors</span>
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Show Selections</label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Highlight other users' selections</span>
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Auto-save</label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Save changes automatically</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Join Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Start Collaboration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  File
                </label>
                <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm">
                  {currentOpenFile || 'No file open'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowJoinDialog(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createOrJoinSession}
                disabled={!userName.trim() || !currentOpenFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export functions for use in other components
export const useCollaboration = () => {
  const sendCursorUpdate = (position: { line: number; column: number }, selection?: { start: number; end: number }) => {
    // This would be implemented to send cursor updates
    console.log('Cursor update:', position, selection);
  };

  const sendEdit = (operation: string, position: number, content?: string, length?: number) => {
    // This would be implemented to send edit operations
    console.log('Edit operation:', operation, position, content, length);
  };

  return { sendCursorUpdate, sendEdit };
};