"""
Advanced debugger with breakpoints, variable inspection, and step execution.
"""
import ast
import inspect
import sys
import traceback
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Set, Tuple, Union
from pathlib import Path
import linecache
import re
import logging

logger = logging.getLogger(__name__)


@dataclass
class Breakpoint:
    """Represents a breakpoint in the debugger."""

    file: str
    line: int
    condition: Optional[str] = None
    hit_count: int = 0
    enabled: bool = True
    log_message: Optional[str] = None


@dataclass
class StackFrame:
    """Represents a stack frame in the debugger."""

    filename: str
    line: int
    function: str
    code_context: List[str]
    local_vars: Dict[str, Any]
    global_vars: Dict[str, Any]
    is_executing: bool = False


@dataclass
class DebuggerState:
    """Current state of the debugger."""

    is_running: bool = False
    is_paused: bool = False
    current_frame: Optional[StackFrame] = None
    breakpoints: Dict[Tuple[str, int], Breakpoint] = field(default_factory=dict)
    call_stack: List[StackFrame] = field(default_factory=list)
    variables: Dict[str, Any] = field(default_factory=dict)
    watch_expressions: List[str] = field(default_factory=list)
    exception: Optional[Exception] = None
    output: List[str] = field(default_factory=list)

    def add_breakpoint(self, file: str, line: int, **kwargs) -> Breakpoint:
        """Add a breakpoint."""
        bp = Breakpoint(file=file, line=line, **kwargs)
        self.breakpoints[(file, line)] = bp
        return bp

    def remove_breakpoint(self, file: str, line: int) -> bool:
        """Remove a breakpoint."""
        key = (file, line)
        if key in self.breakpoints:
            del self.breakpoints[key]
            return True
        return False

    def get_breakpoint(self, file: str, line: int) -> Optional[Breakpoint]:
        """Get a breakpoint by file and line."""
        return self.breakpoints.get((file, line))


class Debugger:
    """Advanced debugger with breakpoints, variable inspection, and step execution."""

    def __init__(self):
        self.state = DebuggerState()
        self.original_trace = sys.gettrace()
        self.original_excepthook = sys.excepthook
        self.break_on_exception = True
        self.break_on_start = False
        self._event_handlers = {
            "breakpoint_hit": [],
            "exception": [],
            "step": [],
            "continue": [],
            "stop": [],
        }

    def on(self, event: str, handler: Callable):
        """Register an event handler."""
        if event in self._event_handlers:
            self._event_handlers[event].append(handler)
        else:
            raise ValueError(f"Unknown event: {event}")

    def _emit(self, event: str, *args, **kwargs):
        """Emit an event to all registered handlers."""
        for handler in self._event_handlers.get(event, []):
            try:
                handler(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {event} handler: {e}")

    async def start_session(
        self,
        code: str,
        language: str = "python",
        breakpoints: Optional[List[Dict[str, Any]]] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> "DebugSession":
        """Start a new debugging session."""
        # Create a new debug session
        session = DebugSession(self, code, language, variables or {})

        # Add breakpoints if provided
        if breakpoints:
            for bp in breakpoints:
                session.add_breakpoint(
                    file=bp.get("file", "<string>"),
                    line=bp["line"],
                    condition=bp.get("condition"),
                    log_message=bp.get("log_message"),
                )

        # Start the debugger
        await session.start()
        return session

    def pause(self):
        """Pause execution at the next opportunity."""
        if self.state.is_running and not self.state.is_paused:
            self.state.is_paused = True
            self._emit("pause")

    def continue_execution(self):
        """Continue execution until the next breakpoint or exception."""
        if self.state.is_paused:
            self.state.is_paused = False
            self._emit("continue")

    def step_over(self):
        """Step over the current line."""
        if self.state.is_paused:
            self._step_mode = "step_over"
            self.continue_execution()

    def step_into(self):
        """Step into the current function call."""
        if self.state.is_paused:
            self._step_mode = "step_into"
            self.continue_execution()

    def step_out(self):
        """Step out of the current function."""
        if self.state.is_paused:
            self._step_mode = "step_out"
            self.continue_execution()

    def stop(self):
        """Stop the debugger."""
        if self.state.is_running:
            self.state.is_running = False
            self.state.is_paused = False
            sys.settrace(self.original_trace)
            sys.excepthook = self.original_excepthook
            self._emit("stop")

    def get_variables(self, scope: str = "local") -> Dict[str, Any]:
        """Get variables from the current scope."""
        if not self.state.current_frame:
            return {}

        if scope == "local":
            return self.state.current_frame.local_vars
        elif scope == "global":
            return self.state.current_frame.global_vars
        else:
            return {}

    def evaluate(self, expression: str) -> Any:
        """Evaluate an expression in the current context."""
        if not self.state.current_frame:
            raise RuntimeError("No active frame")

        try:
            # Create a safe environment with only the necessary variables
            env = {
                **self.state.current_frame.global_vars,
                **self.state.current_frame.local_vars,
                "__builtins__": {
                    k: v for k, v in __builtins__.items() if not k.startswith("_")
                },
            }

            # Disable dangerous builtins
            for name in ["__import__", "eval", "exec", "open", "exit", "quit"]:
                if name in env:
                    del env[name]

            # Evaluate the expression
            return eval(expression, {}, env)
        except Exception as e:
            raise RuntimeError(f"Evaluation error: {e}")


class DebugSession:
    """A single debugging session."""

    def __init__(
        self,
        debugger: Debugger,
        code: str,
        language: str = "python",
        variables: Optional[Dict[str, Any]] = None,
    ):
        self.debugger = debugger
        self.code = code
        self.language = language
        self.variables = variables or {}
        self.breakpoints: Dict[Tuple[str, int], Breakpoint] = {}
        self._task: Optional[asyncio.Task] = None
        self._event = asyncio.Event()
        self._result = None
        self._exception = None

    def add_breakpoint(
        self,
        file: str,
        line: int,
        condition: Optional[str] = None,
        log_message: Optional[str] = None,
    ) -> Breakpoint:
        """Add a breakpoint to this session."""
        bp = Breakpoint(
            file=file, line=line, condition=condition, log_message=log_message
        )
        self.breakpoints[(file, line)] = bp
        return bp

    def remove_breakpoint(self, file: str, line: int) -> bool:
        """Remove a breakpoint."""
        key = (file, line)
        if key in self.breakpoints:
            del self.breakpoints[key]
            return True
        return False

    async def start(self):
        """Start the debugging session."""
        if self._task and not self._task.done():
            raise RuntimeError("Debug session already running")

        self._task = asyncio.create_task(self._run())
        return self

    async def _run(self):
        """Run the code in the debugger."""
        try:
            # Prepare the code for execution
            code_obj = compile(self.code, "<string>", "exec")

            # Create a new namespace for the code
            global_vars = {
                "__name__": "__main__",
                "__file__": "<string>",
                "__debug__": True,
                **self.variables,
            }

            # Set up tracing
            sys.settrace(self._trace_dispatch)

            # Execute the code
            try:
                self._result = exec(code_obj, global_vars, {})
            except Exception as e:
                self._exception = e
                self.debugger._emit("exception", e)

            # Clean up
            sys.settrace(None)

        except Exception as e:
            logger.error(f"Error in debug session: {e}")
            self._exception = e
        finally:
            self._event.set()

    def _trace_dispatch(self, frame, event, arg):
        """Handle trace events from the Python interpreter."""
        if event == "line":
            return self._trace_line(frame)
        elif event == "call":
            return self._trace_call(frame)
        elif event == "return":
            return self._trace_return(frame, arg)
        elif event == "exception":
            return self._trace_exception(frame, arg)
        return self._trace_dispatch

    def _trace_line(self, frame):
        """Handle line events."""
        filename = frame.f_code.co_filename
        line_no = frame.f_lineno

        # Check for breakpoints
        bp = self.breakpoints.get((filename, line_no))
        if bp and bp.enabled:
            # Check condition if present
            if bp.condition:
                try:
                    if not self.debugger.evaluate(bp.condition):
                        return self._trace_dispatch
                except Exception as e:
                    logger.warning(f"Error evaluating breakpoint condition: {e}")
                    return self._trace_dispatch

            # Hit the breakpoint
            bp.hit_count += 1
            self._pause_execution(frame, "breakpoint")

        return self._trace_dispatch

    def _trace_call(self, frame):
        """Handle call events."""
        return self._trace_dispatch

    def _trace_return(self, frame, arg):
        """Handle return events."""
        return self._trace_dispatch

    def _trace_exception(self, frame, arg):
        """Handle exception events."""
        if self.debugger.break_on_exception:
            exc_type, exc_value, exc_traceback = arg
            self._pause_execution(frame, "exception", exception=exc_value)
        return self._trace_dispatch

    def _pause_execution(self, frame, reason, **kwargs):
        """Pause execution and notify the debugger."""
        # Create a stack frame
        stack_frame = self._create_stack_frame(frame)
        self.debugger.state.current_frame = stack_frame

        # Notify the debugger
        if reason == "breakpoint":
            self.debugger._emit("breakpoint_hit", stack_frame)
        elif reason == "exception":
            self.debugger._emit("exception", kwargs["exception"], stack_frame)

        # Wait for continue/step command
        self.debugger.state.is_paused = True
        while self.debugger.state.is_paused:
            time.sleep(0.1)

    def _create_stack_frame(self, frame) -> StackFrame:
        """Create a StackFrame from a Python frame."""
        # Get the code context
        context = []
        try:
            context = inspect.getframeinfo(frame).code_context or []
            context = [line.strip() for line in context]
        except Exception:
            pass

        # Get local and global variables
        local_vars = {}
        global_vars = {}

        try:
            # Only include simple, serializable variables
            for name, value in frame.f_locals.items():
                try:
                    local_vars[name] = self._format_variable(value)
                except Exception:
                    local_vars[name] = str(value)

            for name, value in frame.f_globals.items():
                if not name.startswith("__"):
                    try:
                        global_vars[name] = self._format_variable(value)
                    except Exception:
                        global_vars[name] = str(value)
        except Exception as e:
            logger.warning(f"Error getting variables: {e}")

        return StackFrame(
            filename=frame.f_code.co_filename,
            line=frame.f_lineno,
            function=frame.f_code.co_name,
            code_context=context,
            local_vars=local_vars,
            global_vars=global_vars,
            is_executing=True,
        )

    def _format_variable(self, value, max_depth=3, depth=0):
        """Format a variable for display in the debugger."""
        if depth >= max_depth:
            return str(type(value).__name__)

        if value is None or isinstance(value, (int, float, bool, str)):
            return value

        if isinstance(value, (list, tuple)):
            return [self._format_variable(x, max_depth, depth + 1) for x in value]

        if isinstance(value, dict):
            return {
                str(k): self._format_variable(v, max_depth, depth + 1)
                for k, v in value.items()
            }

        # For objects, get their attributes
        try:
            attrs = {}
            for attr in dir(value):
                if not attr.startswith("_"):
                    try:
                        attr_value = getattr(value, attr)
                        attrs[attr] = self._format_variable(
                            attr_value, max_depth, depth + 1
                        )
                    except Exception:
                        pass
            return {"__type__": type(value).__name__, **attrs}
        except Exception:
            return str(value)

    async def wait(self):
        """Wait for the debug session to complete."""
        if self._task:
            await self._task

    def stop(self):
        """Stop the debug session."""
        if self._task and not self._task.done():
            self._task.cancel()

    @property
    def result(self):
        """Get the result of the debugged code."""
        return self._result

    @property
    def exception(self):
        """Get the exception if one occurred."""
        return self._exception
