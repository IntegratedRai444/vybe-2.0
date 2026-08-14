# backend/debugger_service.py
"""
Debugging service for Python and JavaScript
"""

import json
import logging
import os
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

class DebugSession:
    """Enhanced debugging session with advanced features"""

    def __init__(self, session_id: str, file_path: str, language: str):
        self.session_id = session_id
        self.file_path = os.path.abspath(file_path)
        self.language = language.lower()
        self.breakpoints: Dict[int, Dict] = {}  # line -> breakpoint details
        self.variables: Dict[str, Any] = {}
        self.watch_expressions: List[Dict] = []
        self.call_stack: List[Dict] = []
        self.threads: List[Dict] = [{"id": 1, "name": "Main Thread"}]
        self.current_thread_id = 1
        self.current_line = 1
        self.status = "stopped"  # stopped, running, paused, terminated
        self.process = None
        self.created_at = time.time()
        self.last_breakpoint_id = 0
        self.break_on_exception = False
        self.break_on_entry = True
        self.break_on_return = False
        self.break_on_line = True
        self.break_on_function = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "file_path": self.file_path,
            "language": self.language,
            "breakpoints": [bp for bp in self.breakpoints.values()],
            "variables": self._serialize_variables(self.variables),
            "watch_expressions": self.watch_expressions,
            "call_stack": self.call_stack,
            "threads": self.threads,
            "current_thread_id": self.current_thread_id,
            "current_line": self.current_line,
            "status": self.status,
            "created_at": self.created_at,
            "break_on_exception": self.break_on_exception,
            "break_on_entry": self.break_on_entry,
            "break_on_return": self.break_on_return,
            "break_on_function": self.break_on_function
        }

    def _serialize_variables(self, variables: Dict) -> List[Dict]:
        """Recursively serialize variables for JSON response"""
        result = []
        for name, value in variables.items():
            var_info = {
                "name": name,
                "type": type(value).__name__,
                "value": str(value),
                "variablesReference": 0
            }

            # Handle complex types
            if isinstance(value, (list, tuple, set)):
                var_info["type"] = type(value).__name__
                var_info["value"] = f"<{type(value).__name__} of length {len(value)}>"
                var_info["variablesReference"] = id(value) % 10000 + 1

            elif isinstance(value, dict):
                var_info["type"] = "dict"
                var_info["value"] = f"<dict with {len(value)} items>"
                var_info["variablesReference"] = id(value) % 10000 + 1

            elif hasattr(value, "__dict__"):
                var_info["type"] = value.__class__.__name__
                var_info["value"] = str(value)
                var_info["variablesReference"] = id(value) % 10000 + 1

            result.append(var_info)
        return result

class DebuggerService:
    """Debugging service supporting multiple languages"""

    def __init__(self):
        self.sessions: Dict[str, DebugSession] = {}
        self.event_callbacks: List[Callable] = []

    def add_event_callback(self, callback: Callable):
        """Add callback for debug events"""
        self.event_callbacks.append(callback)

    def _emit_event(self, event_type: str, session_id: str, data: Dict = None):
        """Emit debug event to callbacks"""
        event = {
            "type": event_type,
            "session_id": session_id,
            "timestamp": time.time(),
            "data": data or {}
        }

        for callback in self.event_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Error in debug event callback: {e}")

    def create_session(self, file_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """Create a new debug session"""
        try:
            # Detect language if not provided
            if not language:
                ext = Path(file_path).suffix.lower()
                language_map = {
                    '.py': 'python',
                    '.js': 'javascript',
                    '.ts': 'typescript'
                }
                language = language_map.get(ext, 'unknown')

            if language not in ['python', 'javascript', 'typescript']:
                return {
                    "error": f"Debugging not supported for {language}",
                    "session": None
                }

            # Check if file exists
            if not os.path.exists(file_path):
                return {
                    "error": "File not found",
                    "session": None
                }

            # Create session
            session_id = str(uuid.uuid4())
            session = DebugSession(session_id, file_path, language)
            self.sessions[session_id] = session

            logger.info(f"Created debug session {session_id} for {file_path}")
            self._emit_event("session_created", session_id, {"file_path": file_path})

            return {
                "session": session.to_dict(),
                "error": None
            }

        except Exception as e:
            logger.error(f"Error creating debug session: {e}")
            return {
                "error": str(e),
                "session": None
            }

    def get_session(self, session_id: str) -> Optional[DebugSession]:
        """Get debug session by ID"""
        return self.sessions.get(session_id)

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all active debug sessions"""
        return [session.to_dict() for session in self.sessions.values()]

    def terminate_session(self, session_id: str) -> Dict[str, Any]:
        """Terminate a debug session"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            # Stop any running process
            if session.process:
                try:
                    session.process.terminate()
                    session.process.wait(timeout=5)
                except:
                    try:
                        session.process.kill()
                    except:
                        pass

            session.status = "terminated"
            del self.sessions[session_id]

            self._emit_event("session_terminated", session_id)

            return {"success": True, "message": "Session terminated"}

        except Exception as e:
            logger.error(f"Error terminating session: {e}")
            return {"error": str(e), "success": False}

    # ===== Breakpoint Management =====

    def set_breakpoint(self, session_id: str, line: int, condition: Optional[str] = None, hit_count: Optional[int] = None) -> str:
        """Set a breakpoint with optional condition and hit count"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        bp_id = f"bp_{len(session.breakpoints) + 1}"

        session.breakpoints[line] = {
            "id": bp_id,
            "line": line,
            "condition": condition,
            "hit_count": hit_count,
            "hit_count_current": 0,
            "verified": False,
            "enabled": True
        }

        # If debugger is already running, set the breakpoint
        if session.status == "running" and hasattr(debugpy, 'breakpoint'):
            try:
                debugpy.breakpoint(condition=condition)
                session.breakpoints[line]["verified"] = True
            except Exception as e:
                logger.warning(f"Failed to set breakpoint at line {line}: {e}")

        self._emit_event("breakpoint_set", session_id, {"breakpoint": session.breakpoints[line]})
        return bp_id

    def remove_breakpoint(self, session_id: str, line: int) -> bool:
        """Remove a breakpoint"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if line in session.breakpoints:
            del session.breakpoints[line]
            self._emit_event("breakpoint_removed", session_id, {"line": line})
            return True

        return False

    def toggle_breakpoint(self, session_id: str, line: int, enabled: bool) -> bool:
        """Enable or disable a breakpoint"""
        session = self.sessions.get(session_id)
        if not session or line not in session.breakpoints:
            return False

        session.breakpoints[line]["enabled"] = enabled
        self._emit_event("breakpoint_updated", session_id, {
            "line": line,
            "enabled": enabled
        })
        return True

    # ===== Debug Control =====

    def start_debugging(self, session_id: str, stop_on_entry: bool = False) -> bool:
        """Start debugging session"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if session.status == "running":
            return True

        try:
            if session.language == "python":
                self._start_python_debug(session)
            else:
                raise ValueError(f"Unsupported language: {session.language}")

            session.status = "running"
            self._emit_event("debug_started", session_id, {"stop_on_entry": stop_on_entry})
            return True

        except Exception as e:
            logger.error(f"Error starting debug session: {e}")
            session.status = "error"
            self._emit_event("debug_error", session_id, {"error": str(e)})
            return False

    def _start_python_debug(self, session: DebugSession):
        """Start Python debugging using debugpy"""
        try:
            import debugpy

            # Configure debugpy
            debugpy.configure({"subProcess": True})

            # Start the debugger in a separate thread
            def run_debugger():
                try:
                    # Start the debugger
                    debugpy.listen(('localhost', 0))
                    port = debugpy.debug_this_thread().port

                    # Notify that debugger is ready
                    self._emit_event("debugger_ready", session.session_id, {"port": port})

                    # Wait for debugger to attach
                    debugpy.wait_for_client()

                    # Set breakpoints
                    for bp in session.breakpoints.values():
                        if bp['enabled']:
                            condition = bp.get('condition')
                            debugpy.breakpoint(
                                condition=condition if condition else None
                            )

                    # Start the script
                    with open(session.file_path, 'r') as f:
                        code = compile(f.read(), session.file_path, 'exec')
                        exec(code, globals(), {})

                    session.status = "terminated"
                    self._emit_event("terminated", session.session_id)

                except Exception as e:
                    logger.error(f"Debugger error: {e}")
                    session.status = "error"
                    self._emit_event("error", session.session_id, {"error": str(e)})

            # Start the debugger in a new thread
            debug_thread = threading.Thread(target=run_debugger, daemon=True)
            debug_thread.start()

        except Exception as e:
            logger.error(f"Failed to start debugger: {e}")
            session.status = "error"
            self._emit_event("error", session.session_id, {"error": str(e)})
            raise

    def pause(self, session_id: str) -> bool:
        """Pause execution"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if session.status != "running":
            return False

        if hasattr(debugpy, 'pause'):
            debugpy.pause()
            session.status = "paused"
            self._emit_event("paused", session_id, {"thread_id": session.current_thread_id})
            return True

        return False

    def continue_execution(self, session_id: str) -> bool:
        """Continue execution until next breakpoint"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if session.status != "paused":
            return False

        if hasattr(debugpy, 'continue'):
            debugpy.continue()
            session.status = "running"
            self._emit_event("continued", session_id, {})
            return True

        return False

    def step_over(self, session_id: str) -> bool:
        """Step over current line"""
        session = self.sessions.get(session_id)
        if not session or session.status != "paused":
            return False

        if hasattr(debugpy, 'step_over'):
            debugpy.step_over()
            self._update_debug_state(session_id)
            self._emit_event("stepped", session_id, {"type": "over"})
            return True

        return False

    def step_into(self, session_id: str) -> bool:
        """Step into function call"""
        session = self.sessions.get(session_id)
        if not session or session.status != "paused":
            return False

        if hasattr(debugpy, 'step_into'):
            debugpy.step_into()
            self._update_debug_state(session_id)
            self._emit_event("stepped", session_id, {"type": "into"})
            return True

        return False

    def step_out(self, session_id: str) -> bool:
        """Step out of current function"""
        session = self.sessions.get(session_id)
        if not session or session.status != "paused":
            return False

        if hasattr(debugpy, 'step_out'):
            debugpy.step_out()
            self._update_debug_state(session_id)
            self._emit_event("stepped", session_id, {"type": "out"})
            return True

        return False

    # ===== Debug Information =====

    def get_call_stack(self, session_id: str, thread_id: int = None) -> List[Dict]:
        """Get the call stack for the current or specified thread"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if hasattr(debugpy, 'get_stack'):
            try:
                frames = []
                stack = debugpy.get_stack()

                for i, frame in enumerate(stack):
                    frames.append({
                        'id': i,
                        'name': frame.name,
                        'file': frame.file,
                        'line': frame.line,
                        'column': frame.column,
                        'locals': self._serialize_variables(frame.locals)
                    })

                return frames

            except Exception as e:
                logger.warning(f"Could not get stack with debugpy: {e}")

        # Fallback to basic stack trace
        import traceback
        frames = []
        for i, (frame, _) in enumerate(traceback.walk_stack(sys._current_frames()[threading.get_ident()])):
            frames.append({
                'id': i,
                'name': frame.f_code.co_name,
                'file': frame.f_code.co_filename,
                'line': frame.f_lineno,
                'locals': self._serialize_variables(frame.f_locals)
            })

        return frames

    def get_variables(self, session_id: str, frame_id: int = None, scope: str = "local") -> Dict:
        """Get variables in the current or specified frame"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if hasattr(debugpy, 'get_variables'):
            try:
                # Get variables using debugpy
                variables = {}
                if frame_id is None:
                    # Get current frame variables
                    if scope == 'local':
                        frame = debugpy.current_frame()
                        if frame:
                            variables = frame.f_locals
                    else:
                        # Get all scopes
                        scopes = debugpy.get_scopes()
                        for scope_obj in scopes:
                            if scope == 'global' and scope_obj.name != 'Global':
                                continue
                            for var_ref in scope_obj.variables_reference:
                                var = debugpy.get_variable(var_ref)
                                variables[var.name] = var.value
                else:
                    # Get variables for specific frame
                    frame = debugpy.get_frame(frame_id)
                    if frame:
                        if scope == 'local':
                            variables = frame.f_locals
                        else:
                            variables = {**frame.f_globals, **frame.f_locals}

                return self._serialize_variables(variables)

            except Exception as e:
                logger.warning(f"Could not get variables with debugpy: {e}")

        # Fallback to frame inspection if debugpy is not available
        frame = sys._current_frames().get(threading.get_ident())
        if not frame:
            return {}

        # Get variables based on scope
        if scope == "local":
            variables = frame.f_locals
        elif scope == "global":
            variables = frame.f_globals
        else:
            variables = {**frame.f_globals, **frame.f_locals}

        return self._serialize_variables(variables)

    def evaluate_expression(self, session_id: str, expression: str, frame_id: int = None) -> Dict:
        """Evaluate an expression in the current debug context"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if hasattr(debugpy, 'evaluate'):
            try:
                # Use debugpy for evaluation if available
                result = debugpy.evaluate(expression, frame_id=frame_id)
                return {
                    "result": str(result),
                    "type": type(result).__name__,
                    "value": result,
                    "variables_reference": getattr(result, 'variables_reference', 0),
                    "has_children": getattr(result, 'has_children', False)
                }
            except Exception as e:
                return {"result": None, "error": str(e)}

        # Fallback to frame evaluation
        if session.status != "paused":
            return {"result": None, "error": "Debugger is not paused"}

        try:
            # Get current frame
            frame = sys._current_frames().get(threading.get_ident())
            if not frame:
                return {"result": None, "error": "No active frame"}

            # Evaluate expression in frame context
            result = eval(expression, frame.f_globals, frame.f_locals)
            return {
                "result": str(result),
                "type": type(result).__name__,
                "value": result
            }

        except Exception as e:
            return {"result": None, "error": str(e)}

    def _update_debug_state(self, session_id: str):
        """Update the current debug state (call stack, variables, etc.)"""
        session = self.sessions.get(session_id)
        if not session:
            return

        # Update call stack
        session.call_stack = self.get_call_stack(session_id)

        # Update current line if we have frames
        if session.call_stack:
            top_frame = session.call_stack[0]
            session.current_line = top_frame.get('line', 1)
            session.current_file = top_frame.get('file', '')

        # Update variables for current scope
        if session.call_stack:
            frame_id = session.call_stack[0].get("id")
            if frame_id is not None:
                session.variables = self.get_variables(session_id, frame_id)

    def set_exception_breakpoints(self, session_id: str, filters: List[str]):
        """Configure exception breakpoints"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        if hasattr(debugpy, 'configure'):
            try:
                debugpy.configure(python={
                    'exceptionOptions': [{
                        'breakOnRaised': 'always' if 'raised' in filters else 'never',
                        'breakOnUserUnhandled': 'always' if 'uncaught' in filters else 'never'
                    }]
                })
            except Exception as e:
                logger.warning(f"Could not set exception breakpoints: {e}")

        session.break_on_exception = 'raised' in filters
        session.break_on_uncaught = 'uncaught' in filters

        self._emit_event("exception_breakpoints_updated", session_id, {
            "break_on_exception": session.break_on_exception,
            "break_on_uncaught": session.break_on_uncaught
        })

    def set_breakpoint(self, session_id: str, line: int, condition: Optional[str] = None, hit_count: Optional[int] = None):
        """Set a breakpoint with optional condition and hit count"""
        session = self.get_session(session_id)
        bp_id = f"bp_{len(session.breakpoints) + 1}"

        session.breakpoints[line] = {
            "id": bp_id,
            "line": line,
            "condition": condition,
            "hit_count": hit_count,
            "hit_count_current": 0,
            "verified": False,
            "enabled": True
        }

        # If debugger is already running, set the breakpoint
        if session.status == "running" and hasattr(debugpy, 'breakpoint'):
            try:
                debugpy.breakpoint(condition=condition)
                session.breakpoints[line]["verified"] = True
            except Exception as e:
                logger.warning(f"Failed to set breakpoint at line {line}: {e}")

        self._emit_event("breakpoint_set", session_id, {"breakpoint": session.breakpoints[line]})
        return bp_id

    def remove_breakpoint(self, session_id: str, line: int) -> Dict[str, Any]:
        """Remove a breakpoint"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            if line in session.breakpoints:
                del session.breakpoints[line]
                self._emit_event("breakpoint_removed", session_id, {"line": line})
                return {"success": True, "message": "Breakpoint removed"}
            else:
                return {"error": "Breakpoint not found", "success": False}

        except Exception as e:
            logger.error(f"Error removing breakpoint: {e}")
            return {"error": str(e), "success": False}

    def start_debugging(self, session_id: str) -> Dict[str, Any]:
        """Start debugging session"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            if session.language == 'python':
                return self._start_python_debug(session)
            elif session.language in ['javascript', 'typescript']:
                return self._start_js_debug(session)
            else:
                return {"error": f"Debugging not implemented for {session.language}", "success": False}

        except Exception as e:
            logger.error(f"Error starting debug: {e}")
            return {"error": str(e), "success": False}

    def _start_python_debug(self, session: DebugSession):
        """Start Python debugging using debugpy"""
        try:
            import debugpy

            # Configure debugpy
            debugpy.configure({"subProcess": True})

            # Start the debugger in a separate thread
            def run_debugger():
                try:
                    # Start the debugger
                    debugpy.listen(('localhost', 0))
                    port = debugpy.debug_this_thread().port

                    # Notify that debugger is ready
                    self._emit_event("debugger_ready", session.session_id, {"port": port})

                    # Wait for debugger to attach
                    debugpy.wait_for_client()

                    # Set breakpoints
                    for bp in session.breakpoints.values():
                        if bp['enabled']:
                            condition = bp.get('condition')
                            debugpy.breakpoint(
                                condition=condition if condition else None
                            )

                    # Start the script
                    with open(session.file_path, 'r') as f:
                        code = compile(f.read(), session.file_path, 'exec')
                        exec(code, globals(), locals())

                    self.status = "terminated"
                    self._emit_event("terminated", session.session_id)

                except Exception as e:
                    logger.error(f"Debugger error: {e}")
                    self.status = "error"
                    self._emit_event("error", session.session_id, {"error": str(e)})

            # Start the debugger in a new thread
            debug_thread = threading.Thread(target=run_debugger, daemon=True)
            debug_thread.start()

            self.status = "running"
            self._emit_event("started", session.session_id)

        except Exception as e:
            logger.error(f"Failed to start debugger: {e}")
            self.status = "error"
            self._emit_event("error", session.session_id, {"error": str(e)})
            raise

    def _start_js_debug(self, session: DebugSession) -> Dict[str, Any]:
        """Start JavaScript debugging"""
        try:
            # For JavaScript, we'd typically use Node.js inspector
            session.status = "running"
            session.current_line = 1
            session.variables = {
                "__filename": session.file_path,
                "__dirname": os.path.dirname(session.file_path)
            }
            session.call_stack = [
                {
                    "function": "<anonymous>",
                    "file": session.file_path,
                    "line": 1
                }
            ]

            self._emit_event("debug_started", session.session_id)

            return {
                "success": True,
                "message": "JavaScript debugging started",
                "session": session.to_dict()
            }

        except Exception as e:
            logger.error(f"Error starting JS debug: {e}")
            return {"error": str(e), "success": False}

    def pause_debugging(self, session_id: str) -> Dict[str, Any]:
        """Pause debugging session"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            session.status = "paused"
            self._emit_event("debug_paused", session_id)

            return {"success": True, "message": "Debugging paused"}

        except Exception as e:
            logger.error(f"Error pausing debug: {e}")
            return {"error": str(e), "success": False}

    def resume_debugging(self, session_id: str) -> Dict[str, Any]:
        """Resume debugging session"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            session.status = "running"
            self._emit_event("debug_resumed", session_id)

            return {"success": True, "message": "Debugging resumed"}

        except Exception as e:
            logger.error(f"Error resuming debug: {e}")
            return {"error": str(e), "success": False}

    def step_over(self, session_id: str) -> Dict[str, Any]:
        """Step over current line"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            # Simulate stepping
            session.current_line += 1
            session.status = "paused"

            self._emit_event("debug_stepped", session_id, {
                "step_type": "over",
                "line": session.current_line
            })

            return {
                "success": True,
                "message": "Stepped over",
                "current_line": session.current_line
            }

        except Exception as e:
            logger.error(f"Error stepping over: {e}")
            return {"error": str(e), "success": False}

    def step_into(self, session_id: str) -> Dict[str, Any]:
        """Step into function call"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            # Simulate stepping into
            session.current_line += 1
            session.status = "paused"

            # Add to call stack (simulated)
            session.call_stack.append({
                "function": "some_function",
                "file": session.file_path,
                "line": session.current_line
            })

            self._emit_event("debug_stepped", session_id, {
                "step_type": "into",
                "line": session.current_line
            })

            return {
                "success": True,
                "message": "Stepped into",
                "current_line": session.current_line
            }

        except Exception as e:
            logger.error(f"Error stepping into: {e}")
            return {"error": str(e), "success": False}

    def step_out(self, session_id: str) -> Dict[str, Any]:
        """Step out of current function"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "success": False}

            # Simulate stepping out
            if len(session.call_stack) > 1:
                session.call_stack.pop()

            session.current_line += 1
            session.status = "paused"

            self._emit_event("debug_stepped", session_id, {
                "step_type": "out",
                "line": session.current_line
            })

            return {
                "success": True,
                "message": "Stepped out",
                "current_line": session.current_line
            }

        except Exception as e:
            logger.error(f"Error stepping out: {e}")
            return {"error": str(e), "success": False}

    def get_variables(self, session_id: str, frame_id: Optional[int] = None, scope: str = "local"):
        """Get variables in current scope or specific frame"""
        session = self.get_session(session_id)

        if hasattr(debugpy, 'get_variables'):
            try:
                # Get variables using debugpy
                    "__file__": {"value": session.file_path, "type": "str"}
                }
            else:
                variables = {}

            return {"variables": variables, "scope": scope}

        except Exception as e:
            logger.error(f"Error getting variables: {e}")
            return {"error": str(e), "variables": {}}

    def evaluate_expression(self, session_id: str, expression: str) -> Dict[str, Any]:
        """Evaluate expression in debug context"""
        try:
            session = self.sessions.get(session_id)
            if not session:
                return {"error": "Session not found", "result": None}

            # For now, simulate evaluation
            # In a real implementation, this would evaluate in the debug context
            simulated_results = {
                "x": "10",
                "y": "20",
                "x + y": "30",
                "len('hello')": "5",
                "type(x)": "<class 'int'>"
            }

            result = simulated_results.get(expression, f"<evaluation of '{expression}'>")

            return {
                "result": result,
                "expression": expression,
                "success": True
            }

        except Exception as e:
            logger.error(f"Error evaluating expression: {e}")
            return {"error": str(e), "result": None, "success": False}

# Global debugger service instance
debugger_service = DebuggerService()
