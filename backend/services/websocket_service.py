"""
Enhanced WebSocket service for real-time communication
"""
import json
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Set, Any, Callable, Awaitable
from fastapi import WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

class WebSocketEvent:
    """WebSocket event types and utilities"""
    # Deployment events
    DEPLOYMENT_STARTED = "deployment:started"
    DEPLOYMENT_PROGRESS = "deployment:progress"
    DEPLOYMENT_LOGS = "deployment:logs"
    DEPLOYMENT_COMPLETED = "deployment:completed"
    DEPLOYMENT_FAILED = "deployment:failed"
    
    # Git events
    GIT_STATUS_UPDATED = "git:status_updated"
    GIT_BRANCH_CHANGED = "git:branch_changed"
    GIT_COMMIT_CREATED = "git:commit_created"
    GIT_PUSH_COMPLETED = "git:push_completed"
    GIT_PULL_COMPLETED = "git:pull_completed"
    GIT_MERGE_COMPLETED = "git:merge_completed"
    GIT_CONFLICT_DETECTED = "git:conflict_detected"
    
    # Package events
    PACKAGE_INSTALL_STARTED = "package:install_started"
    PACKAGE_INSTALL_PROGRESS = "package:install_progress"
    PACKAGE_INSTALL_COMPLETED = "package:install_completed"
    PACKAGE_INSTALL_FAILED = "package:install_failed"
    
    @staticmethod
    def create_event(event_type: str, data: Any = None, metadata: Optional[Dict] = None) -> str:
        """Create a standardized WebSocket event"""
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data or {}
        }
        if metadata:
            event["metadata"] = metadata
        return json.dumps(event)

class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.connection_subscriptions: Dict[str, Set[str]] = {}
        self.lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Handle new WebSocket connection"""
        await websocket.accept()
        async with self.lock:
            if client_id not in self.active_connections:
                self.active_connections[client_id] = set()
            self.active_connections[client_id].add(websocket)
            self.connection_subscriptions[client_id] = set()
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        """Handle WebSocket disconnection"""
        async with self.lock:
            if client_id in self.active_connections:
                self.active_connections[client_id].discard(websocket)
                if not self.active_connections[client_id]:
                    del self.active_connections[client_id]
                    if client_id in self.connection_subscriptions:
                        del self.connection_subscriptions[client_id]
    
    async def subscribe(self, client_id: str, channel: str):
        """Subscribe client to a channel"""
        async with self.lock:
            if client_id in self.connection_subscriptions:
                self.connection_subscriptions[client_id].add(channel)
    
    async def unsubscribe(self, client_id: str, channel: str):
        """Unsubscribe client from a channel"""
        async with self.lock:
            if client_id in self.connection_subscriptions:
                self.connection_subscriptions[client_id].discard(channel)
    
    async def broadcast(self, channel: str, message: Any):
        """Broadcast message to all subscribers of a channel"""
        if not isinstance(message, str):
            message = json.dumps(message)
        
        async with self.lock:
            for client_id, subscriptions in self.connection_subscriptions.items():
                if channel in subscriptions and client_id in self.active_connections:
                    for connection in self.active_connections[client_id]:
                        try:
                            if connection.client_state == WebSocket.State.CONNECTED:
                                await connection.send_text(message)
                        except Exception as e:
                            print(f"Error sending message to {client_id}: {e}")
                            self.disconnect(connection, client_id)
    
    async def send_personal_message(self, client_id: str, message: Any):
        """Send message to a specific client"""
        if not isinstance(message, str):
            message = json.dumps(message)
        
        async with self.lock:
            if client_id in self.active_connections:
                for connection in self.active_connections[client_id]:
                    try:
                        if connection.client_state == WebSocket.State.CONNECTED:
                            await connection.send_text(message)
                    except Exception as e:
                        print(f"Error sending message to {client_id}: {e}")
                        self.disconnect(connection, client_id)

# Global WebSocket manager instance
websocket_manager = ConnectionManager()
