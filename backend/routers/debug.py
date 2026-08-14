import asyncio
import json
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from ...debugger_service import DebugSession, debugger_service

router = APIRouter(prefix="/api/debug", tags=["debug"])

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_connections: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, session_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        if session_id not in self.session_connections:
            self.session_connections[session_id] = []
        self.session_connections[session_id].append(client_id)
        return client_id

    def disconnect(self, client_id: str, session_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if (
            session_id in self.session_connections
            and client_id in self.session_connections[session_id]
        ):
            self.session_connections[session_id].remove(client_id)

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast_to_session(self, message: str, session_id: str):
        if session_id in self.session_connections:
            for client_id in self.session_connections[session_id]:
                if client_id in self.active_connections:
                    try:
                        await self.active_connections[client_id].send_text(message)
                    except Exception as e:
                        print(f"Error sending to client {client_id}: {e}")


manager = ConnectionManager()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    client_id = str(uuid.uuid4())

    try:
        # Accept the WebSocket connection
        await manager.connect(websocket, client_id, session_id)

        # Send initial connection confirmation
        await manager.send_personal_message(
            json.dumps({"type": "connection_established", "client_id": client_id}),
            client_id,
        )

        # Keep the connection alive
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages (e.g., debug commands)
            try:
                message = json.loads(data)
                await handle_debug_message(message, session_id, client_id)
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Invalid JSON"}), client_id
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id, session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(client_id, session_id)


async def handle_debug_message(message: dict, session_id: str, client_id: str):
    """Handle incoming debug messages from the client"""
    try:
        message_type = message.get("type")

        if message_type == "start_debug":
            file_path = message.get("file_path")
            if not file_path:
                raise ValueError("file_path is required")

            # Start a new debug session
            session = debugger_service.create_session(file_path, "python")
            await manager.broadcast_to_session(
                json.dumps(
                    {
                        "type": "debug_started",
                        "session_id": session.session_id,
                        "status": "running",
                    }
                ),
                session_id,
            )

        elif message_type == "set_breakpoint":
            line = message.get("line")
            condition = message.get("condition")
            if line is None:
                raise ValueError("line is required")

            debugger_service.set_breakpoint(session_id, line, condition)
            await manager.broadcast_to_session(
                json.dumps(
                    {"type": "breakpoint_set", "line": line, "condition": condition}
                ),
                session_id,
            )

        elif message_type == "remove_breakpoint":
            line = message.get("line")
            if line is None:
                raise ValueError("line is required")

            debugger_service.remove_breakpoint(session_id, line)
            await manager.broadcast_to_session(
                json.dumps({"type": "breakpoint_removed", "line": line}), session_id
            )

        elif message_type == "step_over":
            debugger_service.step_over(session_id)
            await update_debug_state(session_id)

        elif message_type == "step_into":
            debugger_service.step_into(session_id)
            await update_debug_state(session_id)

        elif message_type == "step_out":
            debugger_service.step_out(session_id)
            await update_debug_state(session_id)

        elif message_type == "continue":
            debugger_service.continue_execution(session_id)
            await manager.broadcast_to_session(
                json.dumps({"type": "continued"}), session_id
            )

        elif message_type == "pause":
            debugger_service.pause(session_id)
            await update_debug_state(session_id)

        elif message_type == "evaluate":
            expression = message.get("expression")
            frame_id = message.get("frame_id")
            if not expression:
                raise ValueError("expression is required")

            result = debugger_service.evaluate_expression(
                session_id, expression, frame_id
            )
            await manager.send_personal_message(
                json.dumps(
                    {
                        "type": "evaluation_result",
                        "result": result,
                        "request_id": message.get("request_id"),
                    }
                ),
                client_id,
            )

    except Exception as e:
        await manager.send_personal_message(
            json.dumps(
                {
                    "type": "error",
                    "message": str(e),
                    "request_id": message.get("request_id"),
                }
            ),
            client_id,
        )


async def update_debug_state(session_id: str):
    """Send updated debug state to all clients in the session"""
    try:
        session = debugger_service.get_session(session_id)
        if not session:
            return

        # Get current stack trace
        stack_frames = debugger_service.get_call_stack(session_id)

        # Get variables for the current frame
        variables = {}
        if stack_frames:
            frame_id = stack_frames[0].get("id")
            if frame_id is not None:
                variables = debugger_service.get_variables(session_id, frame_id)

        # Send updated state
        await manager.broadcast_to_session(
            json.dumps(
                {
                    "type": "debug_state",
                    "current_line": session.current_line,
                    "current_file": session.file_path,
                    "stack_frames": stack_frames,
                    "variables": variables,
                    "status": session.status,
                }
            ),
            session_id,
        )
    except Exception as e:
        print(f"Error updating debug state: {e}")


# REST API Endpoints
@router.post("/sessions")
async def create_session(file_path: str):
    """Create a new debug session"""
    try:
        session = debugger_service.create_session(file_path, "python")
        return {"session_id": session.session_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/breakpoints")
async def add_breakpoint(session_id: str, line: int, condition: str = None):
    """Add a breakpoint"""
    try:
        bp_id = debugger_service.set_breakpoint(session_id, line, condition)
        return {"breakpoint_id": bp_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/sessions/{session_id}/breakpoints/{line}")
async def remove_breakpoint(session_id: str, line: int):
    """Remove a breakpoint"""
    try:
        debugger_service.remove_breakpoint(session_id, line)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/step/over")
async def step_over(session_id: str):
    """Step over the current line"""
    try:
        debugger_service.step_over(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/step/into")
async def step_into(session_id: str):
    """Step into the current function call"""
    try:
        debugger_service.step_into(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/step/out")
async def step_out(session_id: str):
    """Step out of the current function"""
    try:
        debugger_service.step_out(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/continue")
async def continue_execution(session_id: str):
    """Continue execution until the next breakpoint"""
    try:
        debugger_service.continue_execution(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/pause")
async def pause_execution(session_id: str):
    """Pause execution"""
    try:
        debugger_service.pause(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}/stack")
async def get_call_stack(session_id: str):
    """Get the current call stack"""
    try:
        stack = debugger_service.get_call_stack(session_id)
        return {"stack_frames": stack}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}/variables")
async def get_variables(session_id: str, frame_id: int = None):
    """Get variables in the current or specified frame"""
    try:
        variables = debugger_service.get_variables(session_id, frame_id)
        return {"variables": variables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/evaluate")
async def evaluate_expression(session_id: str, expression: str, frame_id: int = None):
    """Evaluate an expression in the current debug context"""
    try:
        result = debugger_service.evaluate_expression(session_id, expression, frame_id)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/terminate")
async def terminate_session(session_id: str):
    """Terminate a debug session"""
    try:
        debugger_service.terminate_session(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
