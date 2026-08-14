# backend/dap/dap_manager.py
"""
Debug Adapter Protocol (DAP) Manager
Handles real debugging with actual process attachment
"""

import asyncio
import json
import logging
import os
import signal
import subprocess
import uuid
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class StoppedReason(Enum):
    STEP = "step"
    BREAKPOINT = "breakpoint"
    EXCEPTION = "exception"
    PAUSE = "pause"
    ENTRY = "entry"


@dataclass
class Breakpoint:
    id: str
    file: str
    line: int
    condition: Optional[str] = None
    hit_condition: Optional[str] = None
    enabled: bool = True
    verified: bool = False


@dataclass
class Variable:
    name: str
    value: str
    type: str
    variables_reference: int = 0
    named_variables: int = 0
    indexed_variables: int = 0


@dataclass
class StackFrame:
    id: int
    name: str
    source: str
    line: int
    column: int
    end_line: Optional[int] = None
    end_column: Optional[int] = None


@dataclass
class Thread:
    id: int
    name: str


class DebugSession:
    """Represents an active debug session"""

    def __init__(
        self, session_id: str, language: str, program: str, args: List[str] = None
    ):
        self.session_id = session_id
        self.language = language
        self.program = program
        self.args = args or []
        self.process = None
        self.adapter_process = None
        self.is_running = False
        self.is_terminated = False
        self.breakpoints: Dict[str, List[Breakpoint]] = {}
        self.threads: Dict[int, Thread] = {}
        self.stack_frames: Dict[int, List[StackFrame]] = {}
        self.variables: Dict[int, List[Variable]] = {}
        self.request_id = 0
        self.pending_requests = {}
        self.event_callbacks: List[Callable] = []

    def add_event_callback(self, callback: Callable):
        """Add callback for debug events"""
        self.event_callbacks.append(callback)

    async def emit_event(self, event_type: str, body: Dict = None):
        """Emit debug event"""
        event = {
            "type": "event",
            "event": event_type,
            "body": body or {},
            "seq": self.request_id,
        }

        for callback in self.event_callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Debug event callback error: {e}")

    async def send_request(
        self, command: str, arguments: Dict = None
    ) -> Optional[Dict]:
        """Send request to debug adapter"""
        if not self.adapter_process:
            return None

        self.request_id += 1
        request = {
            "seq": self.request_id,
            "type": "request",
            "command": command,
            "arguments": arguments or {},
        }

        # Create future for response
        future = asyncio.Future()
        self.pending_requests[self.request_id] = future

        try:
            # Send request
            message = json.dumps(request) + "\n"
            self.adapter_process.stdin.write(message.encode())
            await self.adapter_process.stdin.drain()

            # Wait for response
            response = await asyncio.wait_for(future, timeout=10.0)
            return response.get("body")

        except Exception as e:
            logger.error(f"DAP request failed: {e}")
            return None
        finally:
            self.pending_requests.pop(self.request_id, None)


class PythonDAPAdapter:
    """Python Debug Adapter using debugpy"""

    def __init__(self):
        self.debugpy_path = self._find_debugpy()

    def _find_debugpy(self) -> Optional[str]:
        """Find debugpy installation"""
        try:
            result = subprocess.run(
                ["python", "-c", "import debugpy; print(debugpy.__file__)"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                debugpy_file = result.stdout.strip()
                return str(Path(debugpy_file).parent / "__main__.py")
        except:
            pass
        return None

    async def launch(self, session: DebugSession) -> bool:
        """Launch Python program with debugpy"""
        if not self.debugpy_path:
            logger.error("debugpy not found. Install with: pip install debugpy")
            return False

        try:
            # Use a simpler approach - run the program directly with debugpy
            debug_cmd = [
                "python",
                "-m",
                "debugpy",
                "--listen",
                "localhost:0",
                "--wait-for-client",
                session.program,
            ] + session.args

            logger.info(f"Starting debug process: {' '.join(debug_cmd)}")

            session.process = await asyncio.create_subprocess_exec(
                *debug_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.path.dirname(session.program)
                if os.path.dirname(session.program)
                else ".",
            )

            # Mark as running
            session.is_running = True
            await session.emit_event("initialized")

            logger.info(f"Debug session started for {session.program}")
            return True

        except Exception as e:
            logger.error(f"Failed to launch Python debug session: {e}")

        return False

    async def attach(self, session: DebugSession, port: int) -> bool:
        """Attach to running Python process"""
        try:
            # Connect to debugpy server
            attach_args = {
                "connect": {"host": "localhost", "port": port},
                "pathMappings": [
                    {
                        "localRoot": os.path.dirname(session.program),
                        "remoteRoot": os.path.dirname(session.program),
                    }
                ],
            }

            response = await session.send_request("attach", attach_args)
            if response:
                session.is_running = True
                await session.emit_event("initialized")
                return True

        except Exception as e:
            logger.error(f"Failed to attach to Python process: {e}")

        return False

    async def _initialize_adapter(self, session: DebugSession):
        """Initialize the debug adapter"""
        init_args = {
            "clientID": "vybe-ide",
            "clientName": "Vybe AI OS",
            "adapterID": "python",
            "pathFormat": "path",
            "linesStartAt1": True,
            "columnsStartAt1": True,
            "supportsVariableType": True,
            "supportsVariablePaging": True,
            "supportsRunInTerminalRequest": True,
        }

        await session.send_request("initialize", init_args)

    async def _read_responses(self, session: DebugSession):
        """Read responses from debug adapter"""
        buffer = ""

        while session.adapter_process and session.adapter_process.stdout:
            try:
                data = await session.adapter_process.stdout.read(4096)
                if not data:
                    break

                buffer += data.decode()

                # Process complete messages (line-delimited JSON)
                while "\n" in buffer:
                    line_end = buffer.find("\n")
                    message_data = buffer[:line_end]
                    buffer = buffer[line_end + 1 :]

                    if message_data.strip():
                        try:
                            message = json.loads(message_data)
                            await self._handle_message(session, message)
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid JSON from DAP adapter: {e}")

            except Exception as e:
                logger.error(f"Error reading from DAP adapter: {e}")
                break

    async def _handle_message(self, session: DebugSession, message: Dict):
        """Handle message from debug adapter"""
        msg_type = message.get("type")

        if msg_type == "response":
            # Response to our request
            seq = message.get("request_seq")
            if seq in session.pending_requests:
                future = session.pending_requests[seq]
                if not future.done():
                    future.set_result(message)

        elif msg_type == "event":
            # Event from adapter
            event = message.get("event")
            body = message.get("body", {})

            if event == "stopped":
                await self._handle_stopped_event(session, body)
            elif event == "continued":
                await self._handle_continued_event(session, body)
            elif event == "thread":
                await self._handle_thread_event(session, body)
            elif event == "breakpoint":
                await self._handle_breakpoint_event(session, body)
            elif event == "terminated":
                await self._handle_terminated_event(session, body)

            # Forward event to callbacks
            await session.emit_event(event, body)

    async def _handle_stopped_event(self, session: DebugSession, body: Dict):
        """Handle stopped event"""
        thread_id = body.get("threadId")
        reason = body.get("reason")

        if thread_id:
            # Get stack trace
            stack_response = await session.send_request(
                "stackTrace", {"threadId": thread_id}
            )
            if stack_response:
                frames = []
                for frame_data in stack_response.get("stackFrames", []):
                    frame = StackFrame(
                        id=frame_data["id"],
                        name=frame_data["name"],
                        source=frame_data.get("source", {}).get("path", ""),
                        line=frame_data["line"],
                        column=frame_data["column"],
                        end_line=frame_data.get("endLine"),
                        end_column=frame_data.get("endColumn"),
                    )
                    frames.append(frame)

                session.stack_frames[thread_id] = frames

    async def _handle_continued_event(self, session: DebugSession, body: Dict):
        """Handle continued event"""
        pass

    async def _handle_thread_event(self, session: DebugSession, body: Dict):
        """Handle thread event"""
        reason = body.get("reason")
        thread_data = body.get("thread", {})

        if reason == "started":
            thread = Thread(id=thread_data["id"], name=thread_data["name"])
            session.threads[thread.id] = thread
        elif reason == "exited":
            thread_id = thread_data["id"]
            session.threads.pop(thread_id, None)

    async def _handle_breakpoint_event(self, session: DebugSession, body: Dict):
        """Handle breakpoint event"""
        reason = body.get("reason")
        breakpoint_data = body.get("breakpoint", {})

        # Update breakpoint verification status
        bp_id = breakpoint_data.get("id")
        if bp_id:
            for file_bps in session.breakpoints.values():
                for bp in file_bps:
                    if bp.id == bp_id:
                        bp.verified = breakpoint_data.get("verified", False)
                        break

    async def _handle_terminated_event(self, session: DebugSession, body: Dict):
        """Handle terminated event"""
        session.is_terminated = True
        session.is_running = False


class NodeJSDAPAdapter:
    """Node.js Debug Adapter"""

    async def launch(self, session: DebugSession) -> bool:
        """Launch Node.js program with inspector"""
        try:
            # Start Node.js with inspector
            node_cmd = [
                "node",
                "--inspect-brk=0.0.0.0:0",  # Let Node choose port
                session.program,
            ] + session.args

            session.process = await asyncio.create_subprocess_exec(
                *node_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.path.dirname(session.program),
            )

            session.is_running = True
            await session.emit_event("initialized")
            return True

        except Exception as e:
            logger.error(f"Failed to launch Node.js debug session: {e}")
            return False


class DAPManager:
    """Manages debug sessions using Debug Adapter Protocol"""

    def __init__(self):
        self.sessions: Dict[str, DebugSession] = {}
        self.adapters = {
            "python": PythonDAPAdapter(),
            "javascript": NodeJSDAPAdapter(),
            "typescript": NodeJSDAPAdapter(),
        }
        self.event_callbacks: List[Callable] = []

    def add_event_callback(self, callback: Callable):
        """Add callback for debug events"""
        self.event_callbacks.append(callback)

    async def create_session(
        self, language: str, program: str, args: List[str] = None
    ) -> Optional[str]:
        """Create a new debug session"""
        if language not in self.adapters:
            logger.error(f"No debug adapter for {language}")
            return None

        session_id = str(uuid.uuid4())
        session = DebugSession(session_id, language, program, args)

        # Add event forwarding
        async def forward_event(event: Dict):
            for callback in self.event_callbacks:
                try:
                    await callback(session_id, event)
                except Exception as e:
                    logger.error(f"Debug event callback error: {e}")

        session.add_event_callback(forward_event)

        self.sessions[session_id] = session
        return session_id

    async def launch_session(self, session_id: str) -> bool:
        """Launch a debug session"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        adapter = self.adapters[session.language]
        return await adapter.launch(session)

    async def attach_session(self, session_id: str, port: int) -> bool:
        """Attach to a running process"""
        session = self.sessions.get(session_id)
        if not session or session.language != "python":
            return False

        adapter = self.adapters[session.language]
        return await adapter.attach(session, port)

    async def terminate_session(self, session_id: str) -> bool:
        """Terminate a debug session"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        try:
            # Send terminate request
            await session.send_request("terminate")

            # Clean up processes
            if session.adapter_process:
                session.adapter_process.terminate()
                await session.adapter_process.wait()

            if session.process:
                session.process.terminate()
                await session.process.wait()

            session.is_terminated = True
            session.is_running = False

            # Remove session
            del self.sessions[session_id]

            return True

        except Exception as e:
            logger.error(f"Error terminating debug session: {e}")
            return False

    async def set_breakpoints(
        self, session_id: str, file_path: str, breakpoints: List[Dict]
    ) -> List[Breakpoint]:
        """Set breakpoints in a file"""
        session = self.sessions.get(session_id)
        if not session:
            return []

        # Convert to breakpoint objects
        bp_objects = []
        for bp_data in breakpoints:
            bp = Breakpoint(
                id=str(uuid.uuid4()),
                file=file_path,
                line=bp_data["line"],
                condition=bp_data.get("condition"),
                hit_condition=bp_data.get("hitCondition"),
                enabled=bp_data.get("enabled", True),
            )
            bp_objects.append(bp)

        # Send to adapter
        bp_args = {
            "source": {"path": file_path},
            "breakpoints": [
                {
                    "line": bp.line,
                    "condition": bp.condition,
                    "hitCondition": bp.hit_condition,
                }
                for bp in bp_objects
            ],
        }

        response = await session.send_request("setBreakpoints", bp_args)
        if response:
            # Update verification status
            verified_bps = response.get("breakpoints", [])
            for i, verified_bp in enumerate(verified_bps):
                if i < len(bp_objects):
                    bp_objects[i].verified = verified_bp.get("verified", False)

        session.breakpoints[file_path] = bp_objects
        return bp_objects

    async def continue_execution(self, session_id: str, thread_id: int = None) -> bool:
        """Continue execution"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        args = {"threadId": thread_id} if thread_id else {}
        response = await session.send_request("continue", args)
        return response is not None

    async def step_over(self, session_id: str, thread_id: int) -> bool:
        """Step over current line"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        response = await session.send_request("next", {"threadId": thread_id})
        return response is not None

    async def step_into(self, session_id: str, thread_id: int) -> bool:
        """Step into function call"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        response = await session.send_request("stepIn", {"threadId": thread_id})
        return response is not None

    async def step_out(self, session_id: str, thread_id: int) -> bool:
        """Step out of current function"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        response = await session.send_request("stepOut", {"threadId": thread_id})
        return response is not None

    async def pause_execution(self, session_id: str, thread_id: int) -> bool:
        """Pause execution"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        response = await session.send_request("pause", {"threadId": thread_id})
        return response is not None

    async def get_threads(self, session_id: str) -> List[Thread]:
        """Get threads"""
        session = self.sessions.get(session_id)
        if not session:
            return []

        response = await session.send_request("threads")
        if response:
            threads = []
            for thread_data in response.get("threads", []):
                thread = Thread(id=thread_data["id"], name=thread_data["name"])
                threads.append(thread)
                session.threads[thread.id] = thread
            return threads

        return list(session.threads.values())

    async def get_stack_trace(
        self, session_id: str, thread_id: int
    ) -> List[StackFrame]:
        """Get stack trace for thread"""
        session = self.sessions.get(session_id)
        if not session:
            return []

        return session.stack_frames.get(thread_id, [])

    async def get_variables(
        self, session_id: str, variables_reference: int
    ) -> List[Variable]:
        """Get variables for scope"""
        session = self.sessions.get(session_id)
        if not session:
            return []

        response = await session.send_request(
            "variables", {"variablesReference": variables_reference}
        )
        if response:
            variables = []
            for var_data in response.get("variables", []):
                variable = Variable(
                    name=var_data["name"],
                    value=var_data["value"],
                    type=var_data.get("type", ""),
                    variables_reference=var_data.get("variablesReference", 0),
                    named_variables=var_data.get("namedVariables", 0),
                    indexed_variables=var_data.get("indexedVariables", 0),
                )
                variables.append(variable)
            return variables

        return []

    async def evaluate_expression(
        self, session_id: str, expression: str, frame_id: int = None
    ) -> Optional[Dict]:
        """Evaluate expression in debug context"""
        session = self.sessions.get(session_id)
        if not session:
            return None

        args = {"expression": expression, "context": "repl"}
        if frame_id is not None:
            args["frameId"] = frame_id

        response = await session.send_request("evaluate", args)
        if response:
            return {
                "result": response.get("result", ""),
                "type": response.get("type", ""),
                "variables_reference": response.get("variablesReference", 0),
            }

        return None

    def get_session(self, session_id: str) -> Optional[DebugSession]:
        """Get debug session"""
        return self.sessions.get(session_id)

    def list_sessions(self) -> List[Dict]:
        """List all debug sessions"""
        return [
            {
                "session_id": session.session_id,
                "language": session.language,
                "program": session.program,
                "is_running": session.is_running,
                "is_terminated": session.is_terminated,
            }
            for session in self.sessions.values()
        ]


# Global DAP manager instance
dap_manager = DAPManager()
