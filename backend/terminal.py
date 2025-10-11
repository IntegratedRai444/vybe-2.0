# backend/terminal.py
import asyncio
import os
from fastapi import WebSocket, WebSocketDisconnect

async def reader(ws: WebSocket, proc: asyncio.subprocess.Process):
    """Reads from the process stdout and sends to the websocket."""
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        await ws.send_text(line.decode(errors="ignore"))

async def writer(ws: WebSocket, proc: asyncio.subprocess.Process):
    """Reads from the websocket and sends to the process stdin."""
    while True:
        try:
            data = await ws.receive_text()
            proc.stdin.write(data.encode())
            await proc.stdin.drain()
        except WebSocketDisconnect:
            break

async def terminal_session(ws: WebSocket):
    """Handles a websocket connection for an interactive terminal session."""
    await ws.accept()

    # Read optional init with cwd/shell
    init_cwd = os.path.dirname(os.path.abspath(__file__))
    init_shell = None
    try:
        init_msg = await ws.receive_json()
        init_cwd = init_msg.get("cwd", init_cwd)
        init_shell = init_msg.get("shell")
    except Exception:
        # No init JSON, proceed with defaults
        pass

    shell = init_shell or ("cmd.exe" if os.name == "nt" else "/bin/bash")

    proc = await asyncio.create_subprocess_exec(
        shell,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=init_cwd
    )

    read_task = asyncio.create_task(reader(ws, proc))
    write_task = asyncio.create_task(writer(ws, proc))

    try:
        done, pending = await asyncio.wait(
            {read_task, write_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
    finally:
        if proc.returncode is None:
            proc.terminate()
            await proc.wait()
        if not ws.client_state.value == 3: # client state is not DISCONNECTED
            await ws.close()
