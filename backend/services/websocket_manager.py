"""
Enhanced WebSocket manager with authentication, validation, and error handling
"""
import json
import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, Any, Callable, Awaitable, Tuple, List
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from starlette.websockets import WebSocketState
from pydantic import BaseModel, ValidationError
import jwt
import logging
from functools import wraps

# Configure logging
logger = logging.getLogger(__name__)

# Configuration
WEBSOCKET_TIMEOUT = 300  # 5 minutes
MAX_MESSAGE_SIZE = 1024 * 1024  # 1MB
JWT_SECRET = "your-secret-key"  # Should be in environment variables in production
JWT_ALGORITHM = "HS256"

# Models for message validation
class WebSocketMessage(BaseModel):
    type: str
    data: Optional[Dict[str, Any]] = None
    token: Optional[str] = None

class AuthPayload(BaseModel):
    user_id: str
    exp: datetime
    iat: datetime

def requires_auth(f):
    """Decorator to enforce authentication for WebSocket handlers"""
    @wraps(f)
    async def wrapper(self, *args, **kwargs):
        websocket = kwargs.get('websocket') or args[1]
        try:
            # Get token from query parameters or message
            token = websocket.query_params.get("token")
            if not token and 'message' in kwargs:
                message = kwargs['message']
                if isinstance(message, dict) and 'token' in message:
                    token = message['token']
            
            if not token:
                raise HTTPException(
                    status_code=status.WS_1008_POLICY_VIOLATION,
                    detail="Authentication required"
                )
            
            # Validate token
            try:
                payload = jwt.decode(
                    token, 
                    JWT_SECRET, 
                    algorithms=[JWT_ALGORITHM],
                    options={"require": ["exp", "iat", "user_id"]}
                )
                # Update last activity time
                self.last_activity[websocket] = time.time()
                return await f(self, *args, **kwargs, user_id=payload['user_id'])
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.WS_1008_POLICY_VIOLATION,
                    detail="Token expired"
                )
            except jwt.PyJWTError as e:
                raise HTTPException(
                    status_code=status.WS_1008_POLICY_VIOLATION,
                    detail=f"Invalid token: {str(e)}"
                )
        except HTTPException as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e.detail))
            return None
    return wrapper

class ConnectionManager:
    """Manages WebSocket connections with authentication and validation"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.connection_subscriptions: Dict[str, Set[str]] = {}
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self.lock = asyncio.Lock()
        self.last_activity: Dict[WebSocket, float] = {}
        self.heartbeat_task = asyncio.create_task(self._check_timeouts())
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Handle new WebSocket connection with authentication"""
        try:
            # Accept connection first to send errors back to client
            await websocket.accept()
            
            # Set timeout for authentication
            websocket.client.max_message_size = MAX_MESSAGE_SIZE
            
            # Get token from query parameters
            token = websocket.query_params.get("token")
            if not token:
                await websocket.close(
                    code=status.WS_1008_POLICY_VIOLATION,
                    reason="Authentication token required"
                )
                return False
                
            # Validate token
            try:
                payload = jwt.decode(
                    token, 
                    JWT_SECRET, 
                    algorithms=[JWT_ALGORITHM],
                    options={"require": ["exp", "iat", "user_id"]}
                )
                user_id = payload['user_id']
                
                async with self.lock:
                    if client_id not in self.active_connections:
                        self.active_connections[client_id] = set()
                    self.active_connections[client_id].add(websocket)
                    self.connection_subscriptions[client_id] = set()
                    self.connection_metadata[websocket] = {
                        'user_id': user_id,
                        'client_id': client_id,
                        'connected_at': datetime.utcnow(),
                        'last_activity': time.time()
                    }
                    self.last_activity[websocket] = time.time()
                
                logger.info(f"Client {client_id} connected as user {user_id}")
                return True
                
            except jwt.ExpiredSignatureError:
                await websocket.close(
                    code=status.WS_1008_POLICY_VIOLATION,
                    reason="Authentication token expired"
                )
                return False
                
            except jwt.PyJWTError as e:
                await websocket.close(
                    code=status.WS_1008_POLICY_VIOLATION,
                    reason=f"Invalid authentication token: {str(e)}"
                )
                return False
                
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            try:
                await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except:
                pass
            return False
    
    def disconnect(self, websocket: WebSocket, client_id: str = None):
        """Handle WebSocket disconnection"""
        if not client_id:
            # Find client_id from websocket if not provided
            for cid, connections in list(self.active_connections.items()):
                if websocket in connections:
                    client_id = cid
                    break
        
        async with self.lock:
            if client_id and client_id in self.active_connections:
                self.active_connections[client_id].discard(websocket)
                if not self.active_connections[client_id]:
                    del self.active_connections[client_id]
                    if client_id in self.connection_subscriptions:
                        del self.connection_subscriptions[client_id]
            
            # Clean up metadata
            if websocket in self.connection_metadata:
                user_id = self.connection_metadata[websocket].get('user_id', 'unknown')
                logger.info(f"Client {client_id or 'unknown'} (user {user_id}) disconnected")
                del self.connection_metadata[websocket]
            if websocket in self.last_activity:
                del self.last_activity[websocket]
    
    async def subscribe(self, client_id: str, channel: str):
        """Subscribe client to a channel"""
        async with self.lock:
            if client_id in self.connection_subscriptions:
                self.connection_subscriptions[client_id].add(channel)
                logger.info(f"Client {client_id} subscribed to {channel}")
    
    async def unsubscribe(self, client_id: str, channel: str):
        """Unsubscribe client from a channel"""
        async with self.lock:
            if client_id in self.connection_subscriptions:
                self.connection_subscriptions[client_id].discard(channel)
                logger.info(f"Client {client_id} unsubscribed from {channel}")
    
    async def _validate_message(self, message: Any) -> Tuple[bool, str]:
        """Validate WebSocket message format and content"""
        if not isinstance(message, (str, bytes, dict)):
            return False, "Message must be a string, bytes, or dict"
            
        try:
            if isinstance(message, (str, bytes)):
                message_dict = json.loads(message)
            else:
                message_dict = message
                
            # Basic validation
            if not isinstance(message_dict, dict):
                return False, "Message must be a JSON object"
                
            # Validate required fields
            if 'type' not in message_dict:
                return False, "Message must contain 'type' field"
                
            # Size validation
            message_size = len(str(message_dict).encode('utf-8'))
            if message_size > MAX_MESSAGE_SIZE:
                return False, f"Message size {message_size} exceeds maximum {MAX_MESSAGE_SIZE} bytes"
                
            return True, ""
            
        except json.JSONDecodeError:
            return False, "Invalid JSON format"
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    async def _send_message(self, websocket: WebSocket, message: Any) -> bool:
        """Safely send a message with error handling"""
        try:
            if websocket.client_state != WebSocketState.CONNECTED:
                return False
                
            if not isinstance(message, str):
                message = json.dumps(message)
                
            await websocket.send_text(message)
            self.last_activity[websocket] = time.time()
            return True
            
        except WebSocketDisconnect:
            self.disconnect(websocket)
            return False
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {str(e)}")
            self.disconnect(websocket)
            return False
    
    async def broadcast(self, channel: str, message: Any, validate: bool = True):
        """Broadcast message to all subscribers of a channel with validation"""
        # Validate message if needed
        if validate:
            is_valid, error = await self._validate_message(message)
            if not is_valid:
                logger.error(f"Invalid message for broadcast to {channel}: {error}")
                return
        
        # Convert to string if needed
        if not isinstance(message, str):
            try:
                message = json.dumps(message)
            except (TypeError, ValueError) as e:
                logger.error(f"Failed to serialize message: {str(e)}")
                return
        
        # Send to all subscribers
        disconnected = []
        async with self.lock:
            for client_id, subscriptions in list(self.connection_subscriptions.items()):
                if channel in subscriptions and client_id in self.active_connections:
                    for connection in list(self.active_connections[client_id]):
                        if not await self._send_message(connection, message):
                            disconnected.append((connection, client_id))
        
        # Clean up disconnected clients
        for connection, client_id in disconnected:
            self.disconnect(connection, client_id)
    
async def send_personal_message(self, client_id: str, message: Any, validate: bool = True) -> bool:
        """Send message to a specific client with validation and error handling"""
        if validate:
            is_valid, error = await self._validate_message(message)
            if not is_valid:
                logger.error(f"Invalid message for client {client_id}: {error}")
                return False
        
        success = False
        disconnected = []
        
        async with self.lock:
            if client_id in self.active_connections:
                for connection in list(self.active_connections[client_id]):
                    if await self._send_message(connection, message):
                        success = True
                    else:
                        disconnected.append((connection, client_id))
        
        # Clean up disconnected clients
        for connection, cid in disconnected:
            self.disconnect(connection, cid)
            
        return success
        
    async def _check_timeouts(self):
        """Background task to check for inactive connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                now = time.time()
                timeout_connections = []
                
                async with self.lock:
                    for websocket, last_active in list(self.last_activity.items()):
                        if now - last_active > WEBSOCKET_TIMEOUT:
                            client_id = self.connection_metadata.get(websocket, {}).get('client_id')
                            timeout_connections.append((websocket, client_id))
                
                # Close timed out connections
                for websocket, client_id in timeout_connections:
                    logger.warning(f"Closing connection {client_id} due to inactivity")
                    try:
                        await websocket.close(
                            code=status.WS_1008_POLICY_VIOLATION,
                            reason="Connection timed out due to inactivity"
                        )
                    except Exception as e:
                        logger.error(f"Error closing timed out connection: {str(e)}")
                    finally:
                        self.disconnect(websocket, client_id)
                        
            except Exception as e:
                logger.error(f"Error in WebSocket timeout check: {str(e)}")
                await asyncio.sleep(5)  # Prevent tight loop on errors

# Global WebSocket manager instance
websocket_manager = ConnectionManager()

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
    
    @staticmethod
    def parse_event(message: str) -> Dict:
        """Parse a WebSocket event message"""
        try:
            return json.loads(message)
        except json.JSONDecodeError:
            return {"type": "error", "error": "Invalid JSON message"}
