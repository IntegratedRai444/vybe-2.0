# backend/terminal.py
import asyncio
import os
import sys
import logging
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

async def reader(ws: WebSocket, proc: asyncio.subprocess.Process):
    """Reads from the process stdout and sends to the websocket."""
    try:
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            try:
                await ws.send_text(line.decode(errors="ignore"))
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                break
    except Exception as e:
        logger.error(f"Reader error: {e}")

async def writer(ws: WebSocket, proc: asyncio.subprocess.Process):
    """Reads from the websocket and sends to the process stdin."""
    try:
        while True:
            try:
                data = await ws.receive_text()
                if proc.stdin and not proc.stdin.is_closing():
                    proc.stdin.write(data.encode())
                    await proc.stdin.drain()
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"Writer error: {e}")
                break
    except Exception as e:
        logger.error(f"Writer task error: {e}")

async def terminal_session(ws: WebSocket):
    """Handles a websocket connection for an interactive terminal session."""
    await ws.accept()
    logger.info("Terminal WebSocket connection accepted")

    # Read optional init with cwd/shell
    init_cwd = os.getcwd()
    init_shell = None

    try:
        # Try to receive initialization message with timeout
        init_msg = await asyncio.wait_for(ws.receive_json(), timeout=2.0)
        init_cwd = init_msg.get("cwd", init_cwd)
        init_shell = init_msg.get("shell")
        logger.info(f"Received init: cwd={init_cwd}, shell={init_shell}")
    except asyncio.TimeoutError:
        logger.info("No init message received, using defaults")
    except Exception as e:
        logger.warning(f"Error reading init message: {e}")

    # Determine shell based on OS
    if os.name == "nt":  # Windows
        shell = init_shell or "cmd.exe"
        shell_args = []
    else:  # Unix-like
        shell = init_shell or "/bin/bash"
        shell_args = ["-i"]  # Interactive mode

    logger.info(f"Starting shell: {shell}")

    proc = None
    try:
        # Create subprocess
        proc = await asyncio.create_subprocess_exec(
            shell,
            *shell_args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=init_cwd,
            env=os.environ.copy()
        )

        logger.info(f"Process started with PID: {proc.pid}")

        # Start reader and writer tasks
        read_task = asyncio.create_task(reader(ws, proc))
        write_task = asyncio.create_task(writer(ws, proc))

        # Wait for either task to complete or process to exit
        proc_task = asyncio.create_task(proc.wait())
        
        done, pending = await asyncio.wait(
            {read_task, write_task, proc_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        
        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            
        logger.info("Terminal session ended")
            
    except Exception as e:
        logger.error(f"Terminal session error: {e}")
        try:
            await ws.send_text(f"Terminal error: {str(e)}\r\n")
        except:
            pass
    finally:
        # Clean up process
        if proc and proc.returncode is None:
            try:
                proc.terminate()
                try:
                    await asyncio.wait_for(proc.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()
            except Exception as e:
                logger.error(f"Error cleaning up process: {e}")
        
        # Close WebSocket
        try:
            if ws.client_state.value != 3:  # Not DISCONNECTED
                await ws.close()
        except Exception as e:
            logger.error(f"Error closing WebSocket: {e}")
