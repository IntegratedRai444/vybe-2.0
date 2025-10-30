"""
WebSocket routes for real-time communication
"""
import json
import asyncio
from typing import Dict, Optional, List
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, status
from fastapi.responses import JSONResponse

from ..services.websocket_service import websocket_manager, WebSocketEvent
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    client_id: str,
    token: Optional[str] = None
):
    """
    WebSocket endpoint for real-time communication
    
    Args:
        websocket: The WebSocket connection
        client_id: Unique client identifier
        token: Optional authentication token
    """
    # Authenticate the connection if token is provided
    user = None
    if token:
        try:
            user = await get_current_user(token)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    
    await websocket_manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # Handle subscription messages
                if message.get('action') == 'subscribe' and 'channel' in message:
                    channel = message['channel']
                    await websocket_manager.subscribe(client_id, channel)
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event(
                            "subscription:updated",
                            {"channel": channel, "status": "subscribed"}
                        )
                    )
                
                # Handle unsubscription messages
                elif message.get('action') == 'unsubscribe' and 'channel' in message:
                    channel = message['channel']
                    await websocket_manager.unsubscribe(client_id, channel)
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event(
                            "subscription:updated",
                            {"channel": channel, "status": "unsubscribed"}
                        )
                    )
                
                # Handle ping/pong for keepalive
                elif message.get('type') == 'ping':
                    await websocket_manager.send_personal_message(
                        client_id,
                        WebSocketEvent.create_event("pong", {})
                    )
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(
                    client_id,
                    WebSocketEvent.create_event(
                        "error",
                        {"message": "Invalid JSON message"}
                    )
                )
            except Exception as e:
                await websocket_manager.send_personal_message(
                    client_id,
                    WebSocketEvent.create_event(
                        "error",
                        {"message": f"Error processing message: {str(e)}"}
                    )
                )
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, client_id)
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        websocket_manager.disconnect(websocket, client_id)

# API endpoints for WebSocket connection info
@router.get("/connections")
async def get_active_connections():
    """Get information about active WebSocket connections"""
    return {
        "active_connections": len(websocket_manager.active_connections),
        "subscriptions": {
            client_id: list(subs) 
            for client_id, subs in websocket_manager.connection_subscriptions.items()
        }
    }
