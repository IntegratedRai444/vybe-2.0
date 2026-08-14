"""
Enhanced WebSocket Test Client for Vybe 2.0

Features:
- Better error handling and reconnection
- Support for authentication
- JSON message formatting
- Interactive shell with command history
"""
import asyncio
import json
import logging
import os
import signal
import sys
import time
from typing import Any, Dict, Optional

import websockets

# Enable debug logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("websocket_client.log")],
)
logger = logging.getLogger(__name__)

# Configuration
WS_URL = os.getenv("WS_URL", "ws://localhost:8000/ws")
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
RECONNECT_DELAY = 5  # seconds


class WebSocketClient:
    def __init__(self):
        self.websocket = None
        self.running = False
        self.receive_task = None
        self.ping_interval = 25  # Send ping every 25 seconds
        self.last_ping = 0

    async def connect(self):
        """Connect to the WebSocket server with reconnection"""
        headers = {}
        if AUTH_TOKEN:
            headers["Authorization"] = f"Bearer {AUTH_TOKEN}"

        while not self.running:
            try:
                logger.info(f"🔌 Attempting to connect to {WS_URL}...")
                print(f"🔌 Attempting to connect to {WS_URL}...")

                # Add more connection options for debugging
                self.websocket = await websockets.connect(
                    WS_URL,
                    extra_headers=headers,
                    ping_interval=20,  # Send ping every 20 seconds
                    ping_timeout=10,  # Wait 10 seconds for pong
                    close_timeout=5,  # Wait 5 seconds for close handshake
                    max_size=10 * 1024 * 1024,  # 10MB max message size
                    logger=logger,  # Enable websockets library logging
                    compression=None,  # Disable compression for debugging
                )

                # Verify connection is open
                if self.websocket.open:
                    logger.info("✅ WebSocket connection established")
                    print("✅ Connected to WebSocket server")
                    self.last_ping = time.time()
                    return True
                else:
                    logger.error("❌ WebSocket connection failed: Connection not open")
                    print("❌ Failed to establish WebSocket connection")

            except Exception as e:
                error_msg = f"❌ Connection failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                print(error_msg)

                if self.running:  # Only retry if we're not shutting down
                    logger.info(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
                    print(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
                    await asyncio.sleep(RECONNECT_DELAY)
                else:
                    return False

            except Exception as e:
                print(f"❌ Connection failed: {e}")
                if self.running:  # Only retry if we're not shutting down
                    print(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
                    await asyncio.sleep(RECONNECT_DELAY)
                else:
                    return False

    async def send_message(self, message: Dict[str, Any]):
        """Send a message to the server"""
        if not self.websocket:
            print("❌ Not connected to server")
            return False

        try:
            await self.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            return False

    async def receive_messages(self):
        """Handle incoming WebSocket messages"""
        while self.running and self.websocket:
            try:
                message = await self.websocket.recv()
                self.last_ping = time.time()

                try:
                    data = json.loads(message)
                    print(f"\n📨 Received: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError:
                    print(f"\n📨 Received (raw): {message}")

            except websockets.exceptions.ConnectionClosed as e:
                print(f"\n❌ Connection closed: {e}")
                if self.running:  # Only try to reconnect if we're not shutting down
                    print("🔄 Attempting to reconnect...")
                    await self.connect()
                break
            except Exception as e:
                print(f"\n❌ Error receiving message: {e}")
                await asyncio.sleep(1)  # Prevent tight loop on errors

    async def keepalive(self):
        """Send periodic pings to keep the connection alive"""
        while self.running and self.websocket:
            try:
                if time.time() - self.last_ping > self.ping_interval:
                    if await self.send_message(
                        {"type": "ping", "timestamp": int(time.time())}
                    ):
                        self.last_ping = time.time()
            except Exception as e:
                print(f"❌ Keepalive error: {e}")
            await asyncio.sleep(1)

    async def run(self):
        """Main client loop"""
        self.running = True

        if not await self.connect():
            return

        # Start background tasks
        self.receive_task = asyncio.create_task(self.receive_messages())
        keepalive_task = asyncio.create_task(self.keepalive())

        print("\nType 'exit' to quit")
        print("Available commands:")
        print("  ping       - Send a ping message")
        print("  subscribe  - Subscribe to updates")
        print("  help       - Show this help")

        while self.running:
            try:
                # Read input without blocking
                try:
                    message = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: input("\n> ").strip()
                    )
                except (EOFError, KeyboardInterrupt):
                    print("\nDisconnecting...")
                    break

                if not message:
                    continue

                if message.lower() == "exit":
                    break

                if message.lower() == "ping":
                    await self.send_message(
                        {"type": "ping", "timestamp": int(time.time())}
                    )
                elif message.lower() == "subscribe":
                    await self.send_message(
                        {"type": "subscribe", "channels": ["updates"]}
                    )
                elif message.lower() in ("help", "?"):
                    print("\nAvailable commands:")
                    print("  ping       - Send a ping message")
                    print("  subscribe  - Subscribe to updates")
                    print("  help       - Show this help")
                    print("  exit       - Disconnect and exit")
                else:
                    # Try to parse as JSON, otherwise send as raw message
                    try:
                        msg = json.loads(message)
                        await self.send_message(msg)
                    except json.JSONDecodeError:
                        await self.send_message({"type": "message", "content": message})

            except Exception as e:
                print(f"\n❌ Error: {e}")

        # Cleanup
        self.running = False
        if self.receive_task:
            self.receive_task.cancel()
            try:
                await self.receive_task
            except asyncio.CancelledError:
                pass

        keepalive_task.cancel()
        try:
            await keepalive_task
        except asyncio.CancelledError:
            pass

        if self.websocket:
            await self.websocket.close()


async def test_http_connection():
    """Test if the HTTP server is responding"""
    import aiohttp

    http_url = (
        WS_URL.replace("ws://", "http://").replace("wss://", "https://").split("/ws")[0]
        or "http://localhost:8000"
    )

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(http_url) as response:
                if response.status == 200:
                    print(f"✅ HTTP server is running at {http_url}")
                    return True
                else:
                    print(f"⚠️  HTTP server returned status {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Could not connect to HTTP server at {http_url}: {e}")
        return False


async def main():
    print("🚀 Vybe 2.0 WebSocket Test Client")
    print("-" * 80)

    # First, test HTTP connection
    print("\n🔍 Testing server connection...")
    http_ok = await test_http_connection()
    if not http_ok:
        print(
            "\n❌ Cannot connect to the server. Please make sure the server is running with:"
        )
        print("   cd backend")
        print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return

    print("\n🔌 Attempting WebSocket connection...")
    client = WebSocketClient()
    try:
        await client.run()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error("Unexpected error:", exc_info=True)
        print(f"\n❌ An error occurred: {e}")
    finally:
        print("\n👋 Disconnected")
        print("\n💡 Check 'websocket_client.log' for detailed error information.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Exiting...")
        sys.exit(0)
