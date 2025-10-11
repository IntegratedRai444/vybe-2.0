"""
Collaborative Editing Session Manager
Handles real-time collaboration sessions with WebSocket support
"""

import asyncio
import json
import uuid
from typing import Dict, Set, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


@dataclass
class User:
    """Represents a connected user"""
    id: str
    name: str
    color: str
    cursor_position: Optional[Dict[str, int]] = None
    selection: Optional[Dict[str, int]] = None
    
    def to_dict(self):
        return asdict(self)


@dataclass
class EditOperation:
    """Represents a text edit operation"""
    id: str
    user_id: str
    timestamp: float
    operation_type: str  # 'insert', 'delete', 'replace'
    position: int
    content: str
    length: int = 0
    
    def to_dict(self):
        return asdict(self)


class CollaborationSession:
    """Manages a single collaboration session for a file"""
    
    def __init__(self, session_id: str, file_path: str):
        self.session_id = session_id
        self.file_path = file_path
        self.users: Dict[str, User] = {}
        self.connections: Dict[str, WebSocket] = {}
        self.operations: List[EditOperation] = []
        self.content: str = ""
        self.version: int = 0
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        
    def add_user(self, user: User, websocket: WebSocket):
        """Add a user to the session"""
        self.users[user.id] = user
        self.connections[user.id] = websocket
        self.last_activity = datetime.now()
        logger.info(f"User {user.name} joined session {self.session_id}")
        
    def remove_user(self, user_id: str):
        """Remove a user from the session"""
        if user_id in self.users:
            user = self.users.pop(user_id)
            self.connections.pop(user_id, None)
            self.last_activity = datetime.now()
            logger.info(f"User {user.name} left session {self.session_id}")
            
    def get_active_users(self) -> List[Dict]:
        """Get list of active users"""
        return [user.to_dict() for user in self.users.values()]
    
    def apply_operation(self, operation: EditOperation) -> bool:
        """Apply an edit operation to the content"""
        try:
            if operation.operation_type == 'insert':
                self.content = (
                    self.content[:operation.position] +
                    operation.content +
                    self.content[operation.position:]
                )
            elif operation.operation_type == 'delete':
                self.content = (
                    self.content[:operation.position] +
                    self.content[operation.position + operation.length:]
                )
            elif operation.operation_type == 'replace':
                self.content = (
                    self.content[:operation.position] +
                    operation.content +
                    self.content[operation.position + operation.length:]
                )
            
            self.operations.append(operation)
            self.version += 1
            self.last_activity = datetime.now()
            return True
        except Exception as e:
            logger.error(f"Failed to apply operation: {e}")
            return False
    
    async def broadcast(self, message: Dict, exclude_user: Optional[str] = None):
        """Broadcast a message to all connected users"""
        disconnected = []
        
        for user_id, websocket in self.connections.items():
            if user_id == exclude_user:
                continue
                
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                disconnected.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected:
            self.remove_user(user_id)
    
    def get_session_info(self) -> Dict:
        """Get session information"""
        return {
            'session_id': self.session_id,
            'file_path': self.file_path,
            'users': self.get_active_users(),
            'version': self.version,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'operation_count': len(self.operations)
        }


class SessionManager:
    """Manages all collaboration sessions"""
    
    def __init__(self):
        self.sessions: Dict[str, CollaborationSession] = {}
        self.user_colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
        ]
        self.color_index = 0
        
    def create_session(self, file_path: str) -> CollaborationSession:
        """Create a new collaboration session"""
        session_id = str(uuid.uuid4())
        session = CollaborationSession(session_id, file_path)
        self.sessions[session_id] = session
        logger.info(f"Created session {session_id} for {file_path}")
        return session
    
    def get_session(self, session_id: str) -> Optional[CollaborationSession]:
        """Get a session by ID"""
        return self.sessions.get(session_id)
    
    def get_or_create_session(self, file_path: str) -> CollaborationSession:
        """Get existing session for file or create new one"""
        # Check if session exists for this file
        for session in self.sessions.values():
            if session.file_path == file_path:
                return session
        
        # Create new session
        return self.create_session(file_path)
    
    def delete_session(self, session_id: str):
        """Delete a session"""
        if session_id in self.sessions:
            session = self.sessions.pop(session_id)
            logger.info(f"Deleted session {session_id}")
    
    def create_user(self, name: str) -> User:
        """Create a new user with unique color"""
        user_id = str(uuid.uuid4())
        color = self.user_colors[self.color_index % len(self.user_colors)]
        self.color_index += 1
        
        return User(
            id=user_id,
            name=name,
            color=color
        )
    
    def get_all_sessions(self) -> List[Dict]:
        """Get information about all active sessions"""
        return [session.get_session_info() for session in self.sessions.values()]
    
    def cleanup_inactive_sessions(self, max_inactive_minutes: int = 30):
        """Remove sessions that have been inactive"""
        now = datetime.now()
        to_remove = []
        
        for session_id, session in self.sessions.items():
            inactive_minutes = (now - session.last_activity).total_seconds() / 60
            if inactive_minutes > max_inactive_minutes and len(session.users) == 0:
                to_remove.append(session_id)
        
        for session_id in to_remove:
            self.delete_session(session_id)
            logger.info(f"Cleaned up inactive session {session_id}")


# Global session manager instance
session_manager = SessionManager()


async def handle_websocket_message(
    session: CollaborationSession,
    user: User,
    message: Dict
):
    """Handle incoming WebSocket message"""
    message_type = message.get('type')
    
    if message_type == 'edit':
        # Handle edit operation
        operation = EditOperation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            timestamp=datetime.now().timestamp(),
            operation_type=message['operation'],
            position=message['position'],
            content=message.get('content', ''),
            length=message.get('length', 0)
        )
        
        if session.apply_operation(operation):
            # Broadcast to other users
            await session.broadcast({
                'type': 'edit',
                'user': user.to_dict(),
                'operation': operation.to_dict(),
                'version': session.version
            }, exclude_user=user.id)
    
    elif message_type == 'cursor':
        # Update cursor position
        user.cursor_position = message.get('position')
        user.selection = message.get('selection')
        
        # Broadcast cursor update
        await session.broadcast({
            'type': 'cursor',
            'user': user.to_dict()
        }, exclude_user=user.id)
    
    elif message_type == 'sync':
        # Send current state to user
        return {
            'type': 'sync',
            'content': session.content,
            'version': session.version,
            'users': session.get_active_users()
        }
    
    return None