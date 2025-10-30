"""
WebSocket Authentication Endpoint
Handles WebSocket connection authentication
"""
from fastapi import WebSocket, WebSocketDisconnect, Depends, status
from fastapi.responses import JSONResponse
from typing import Optional
import jwt
import os

from ..config import settings
from ..dependencies import get_current_user
from ..models.user import User
from ..services.websocket_service import websocket_manager

async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str] = None
) -> Optional[User]:
    """Authenticate WebSocket connection"""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
    except jwt.JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    
    # Here you would typically fetch the user from the database
    # For now, we'll return a simple user object
    return User(id=user_id, email=payload.get("email", ""))

async def get_ws_user(
    websocket: WebSocket,
    token: Optional[str] = None
) -> Optional[User]:
    """Dependency for WebSocket authentication"""
    return await authenticate_websocket(websocket, token)
