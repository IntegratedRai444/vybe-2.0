"""
Enhanced WebSocket Routes with Authentication and Validation
Handles secure real-time communication with the frontend
"""
import json
import asyncio
import logging
from typing import Dict, List, Optional, Set, Any, Callable, Awaitable
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
import jwt

from ..services.websocket_manager import websocket_manager, WebSocketEvent
from ..mcp.models import ScanResult, FileChangeEvent, CodeIssue
from ..mcp.service import get_mcp_service, MCPService

# Configure logging
logger = logging.getLogger(__name__)

# Configuration
JWT_SECRET = "your-secret-key"  # Should be in environment variables in production
JWT_ALGORITHM = "HS256"

# Models
class WebSocketMessage(BaseModel):
    """Base WebSocket message model"""
    type: str
    data: Optional[Dict[str, Any]] = None
    token: Optional[str] = None

class AuthPayload(BaseModel):
    """JWT authentication payload"""
    user_id: str
    exp: datetime
    iat: datetime

router = APIRouter()

# Helper functions
async def authenticate_websocket(websocket: WebSocket, client_id: str) -> Optional[Dict]:
    """Authenticate WebSocket connection using JWT token"""
    try:
        # Get token from query parameters
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication token required"
            )
            return None
            
        # Decode and verify token
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM],
                options={"require": ["exp", "iat", "user_id"]}
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication token expired"
            )
            return None
            
        except jwt.PyJWTError as e:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason=f"Invalid authentication token: {str(e)}"
            )
            return None
            
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
        return None

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time communication with authentication and validation
    
    Query Parameters:
        token: JWT authentication token (required)
    """
    # Authenticate connection
    auth_payload = await authenticate_websocket(websocket, client_id)
    if not auth_payload:
        return
    
    # Connect to WebSocket manager
    connected = await websocket_manager.connect(websocket, client_id)
    if not connected:
        return
    
    user_id = auth_payload['user_id']
    logger.info(f"WebSocket connected - Client: {client_id}, User: {user_id}")
    
    try:
        while True:
            try:
                # Receive and validate message
                message = await websocket.receive_json()
                
                # Update last activity
                websocket_manager.last_activity[websocket] = time.time()
                
                # Validate message structure
                try:
                    ws_message = WebSocketMessage(**message)
                except ValidationError as e:
                    logger.warning(f"Invalid message format from {client_id}: {str(e)}")
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event(
                            "error",
                            {"error": "Invalid message format", "details": str(e)}
                        )
                    )
                    continue
                
                # Handle message types
                message_type = ws_message.type.lower()
                
                # Handle subscription messages
                if message_type == 'subscribe':
                    channel = ws_message.data.get('channel') if ws_message.data else None
                    if channel:
                        await websocket_manager.subscribe(client_id, channel)
                        await websocket_manager.send_personal_message(
                            client_id,
                            WebSocketEvent.create_event(
                                "subscription_update",
                                {"channel": channel, "status": "subscribed"}
                            )
                        )
                
                # Handle unsubscription messages
                elif message_type == 'unsubscribe':
                    channel = ws_message.data.get('channel') if ws_message.data else None
                    if channel:
                        await websocket_manager.unsubscribe(client_id, channel)
                        await websocket_manager.send_personal_message(
                            client_id,
                            WebSocketEvent.create_event(
                                "subscription_update",
                                {"channel": channel, "status": "unsubscribed"}
                            )
                        )
                
                # Handle ping/pong for keepalive
                elif message_type == 'ping':
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event("pong", {})
                    )
                
                # Forward other messages to appropriate handlers
                else:
                    await handle_custom_message(websocket, client_id, ws_message)
            
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from {client_id}")
                await websocket_manager.send_personal_message(
                    client_id,
                    WebSocketEvent.create_event(
                        "error",
                        {"error": "Invalid JSON format"}
                    )
                )
            
            except asyncio.CancelledError:
                raise
                
            except Exception as e:
                logger.error(f"Error processing message from {client_id}: {str(e)}", exc_info=True)
                try:
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event(
                            "error",
                            {"error": "Internal server error"}
                        )
                    )
                except:
                    pass
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected - Client: {client_id}, User: {user_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}", exc_info=True)
    
    finally:
        # Clean up
        websocket_manager.disconnect(websocket, client_id)

async def handle_custom_message(websocket: WebSocket, client_id: str, message: WebSocketMessage):
    """Handle custom message types with appropriate validation"""
    try:
        # Add your custom message handling here
        # Example:
        # if message.type == 'custom_action':
        #     await handle_custom_action(client_id, message.data)
        pass
        
    except Exception as e:
        logger.error(f"Error handling message from {client_id}: {str(e)}", exc_info=True)
        await websocket_manager.send_personal_message(
            client_id,
            WebSocketEvent.create_event(
                "error",
                {"error": f"Failed to process message: {str(e)}"}
            )
        )

# WebSocket message handlers
async def send_scan_result(result: ScanResult):
    """Send scan results to all subscribed clients"""
    await websocket_manager.broadcast(
        'scan_results',
        WebSocketEvent.create_event(
            'scan_result',
            result.dict() if hasattr(result, 'dict') else result
        )
    )

async def send_file_change(event: FileChangeEvent):
    """Send file change events to all subscribed clients"""
    await websocket_manager.broadcast(
        'file_changes',
        WebSocketEvent.create_event(
            'file_change',
            event.dict() if hasattr(event, 'dict') else event
        )
    )

async def setup_websocket_hooks():
    """Register WebSocket hooks with the MCP service"""
    try:
        mcp = await get_mcp_service()
        
        # Store the original _notify_scan_complete method if it exists
        if hasattr(mcp, '_notify_scan_complete'):
            original_notify = mcp._notify_scan_complete
            
            # Create a new method that calls the original and sends WebSocket updates
            async def notify_with_ws(result: ScanResult):
                try:
                    # Call the original method if it exists
                    if original_notify:
                        await original_notify(result)
                    
                    # Send WebSocket update
                    await send_scan_result(result)
                except Exception as e:
                    logger.error(f"Error in WebSocket notification: {str(e)}", exc_info=True)
            
            # Replace the method
            mcp._notify_scan_complete = notify_with_ws
            logger.info("WebSocket hooks registered with MCP service")
        else:
            logger.warning("MCP service does not have _notify_scan_complete method")
            
    except Exception as e:
        logger.error(f"Failed to setup WebSocket hooks: {str(e)}", exc_info=True)

# Run setup when this module is imported
import asyncio
import time

async def delayed_setup():
    """Delay setup to ensure all services are initialized"""
    await asyncio.sleep(5)  # Wait for services to initialize
    await setup_websocket_hooks()

# Start the setup in the background
asyncio.create_task(delayed_setup())
