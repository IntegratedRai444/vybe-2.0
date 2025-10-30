# backend/lsp/lsp_manager.py
"""
Language Server Protocol (LSP) Manager
Handles communication with language servers for advanced code intelligence
"""

import asyncio
import json
import logging
import subprocess
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
import websockets
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class Position:
    line: int
    character: int

@dataclass
class Range:
    start: Position
    end: Position

@dataclass
class Diagnostic:
    range: Range
    severity: int  # 1=Error, 2=Warning, 3=Info, 4=Hint
    message: str
    source: str
    code: Optional[str] = None

@dataclass
class CompletionItem:
    label: str
    kind: int
    detail: Optional[str] = None
    documentation: Optional[str] = None
    insert_text: Optional[str] = None
    sort_text: Optional[str] = None

class LSPServer:
    """Represents a running language server"""
    
    def __init__(self, language: str, command: List[str], root_path: str):
        self.language = language
        self.command = command
        self.root_path = root_path
        self.process = None
        self.request_id = 0
        self.pending_requests = {}
        self.capabilities = {}
        self.initialized = False
        
    async def start(self):
        """Start the language server process"""
        try:
            self.process = await asyncio.create_subprocess_exec(
                *self.command,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.root_path
            )
            
            # Start reading responses
            asyncio.create_task(self._read_responses())
            
            # Initialize the server
            await self._initialize()
            
            logger.info(f"Started {self.language} LSP server")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start {self.language} LSP server: {e}")
            return False
    
    async def stop(self):
        """Stop the language server"""
        if self.process:
            try:
                await self._send_request("shutdown", {})
                await self._send_notification("exit", {})
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except:
                self.process.terminate()
                await self.process.wait()
            finally:
                self.process = None
                self.initialized = False
    
    async def _initialize(self):
        """Initialize the language server"""
        init_params = {
            "processId": None,
            "rootPath": self.root_path,
            "rootUri": f"file://{self.root_path}",
            "capabilities": {
                "textDocument": {
                    "completion": {"completionItem": {"snippetSupport": True}},
                    "hover": {"contentFormat": ["markdown", "plaintext"]},
                    "signatureHelp": {"signatureInformation": {"documentationFormat": ["markdown"]}},
                    "definition": {"linkSupport": True},
                    "references": {"context": True},
                    "documentHighlight": {},
                    "documentSymbol": {"symbolKind": {"valueSet": list(range(1, 27))}},
                    "codeAction": {"codeActionLiteralSupport": {"codeActionKind": {"valueSet": ["quickfix"]}}},
                    "rename": {"prepareSupport": True},
                    "publishDiagnostics": {"relatedInformation": True}
                },
                "workspace": {
                    "applyEdit": True,
                    "workspaceEdit": {"documentChanges": True},
                    "didChangeConfiguration": {"dynamicRegistration": True},
                    "didChangeWatchedFiles": {"dynamicRegistration": True}
                }
            }
        }
        
        response = await self._send_request("initialize", init_params)
        if response:
            self.capabilities = response.get("capabilities", {})
            await self._send_notification("initialized", {})
            self.initialized = True
            return True
        return False
    
    async def _send_request(self, method: str, params: Dict) -> Optional[Dict]:
        """Send a request and wait for response"""
        if not self.process:
            return None
            
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params
        }
        
        # Create future for response
        future = asyncio.Future()
        self.pending_requests[self.request_id] = future
        
        try:
            # Send request
            message = json.dumps(request)
            content = f"Content-Length: {len(message)}\r\n\r\n{message}"
            self.process.stdin.write(content.encode())
            await self.process.stdin.drain()
            
            # Wait for response
            response = await asyncio.wait_for(future, timeout=10.0)
            return response.get("result")
            
        except Exception as e:
            logger.error(f"LSP request failed: {e}")
            return None
        finally:
            self.pending_requests.pop(self.request_id, None)
    
    async def _send_notification(self, method: str, params: Dict):
        """Send a notification (no response expected)"""
        if not self.process:
            return
            
        notification = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }
        
        try:
            message = json.dumps(notification)
            content = f"Content-Length: {len(message)}\r\n\r\n{message}"
            self.process.stdin.write(content.encode())
            await self.process.stdin.drain()
        except Exception as e:
            logger.error(f"LSP notification failed: {e}")
    
    async def _read_responses(self):
        """Read responses from the language server"""
        buffer = b""
        
        while self.process and self.process.stdout:
            try:
                data = await self.process.stdout.read(4096)
                if not data:
                    break
                    
                buffer += data
                
                # Process complete messages
                while b"\r\n\r\n" in buffer:
                    header_end = buffer.find(b"\r\n\r\n")
                    header = buffer[:header_end].decode()
                    
                    # Parse Content-Length
                    content_length = 0
                    for line in header.split("\r\n"):
                        if line.startswith("Content-Length:"):
                            content_length = int(line.split(":")[1].strip())
                            break
                    
                    if len(buffer) >= header_end + 4 + content_length:
                        # We have the complete message
                        message_data = buffer[header_end + 4:header_end + 4 + content_length]
                        buffer = buffer[header_end + 4 + content_length:]
                        
                        try:
                            message = json.loads(message_data.decode())
                            await self._handle_message(message)
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid JSON from LSP server: {e}")
                    else:
                        break
                        
            except Exception as e:
                logger.error(f"Error reading from LSP server: {e}")
                break
    
    async def _handle_message(self, message: Dict):
        """Handle a message from the language server"""
        if "id" in message:
            # Response to our request
            request_id = message["id"]
            if request_id in self.pending_requests:
                future = self.pending_requests[request_id]
                if not future.done():
                    future.set_result(message)
        elif message.get("method") == "textDocument/publishDiagnostics":
            # Diagnostic notification
            await self._handle_diagnostics(message["params"])
    
    async def _handle_diagnostics(self, params: Dict):
        """Handle diagnostic notifications"""
        uri = params["uri"]
        diagnostics = params["diagnostics"]
        
        # Convert to our format
        converted_diagnostics = []
        for diag in diagnostics:
            range_data = diag["range"]
            diagnostic = Diagnostic(
                range=Range(
                    start=Position(range_data["start"]["line"], range_data["start"]["character"]),
                    end=Position(range_data["end"]["line"], range_data["end"]["character"])
                ),
                severity=diag.get("severity", 1),
                message=diag["message"],
                source=diag.get("source", "lsp"),
                code=diag.get("code")
            )
            converted_diagnostics.append(diagnostic)
        
        # Notify diagnostics callback if set
        if hasattr(self, 'diagnostics_callback'):
            await self.diagnostics_callback(uri, converted_diagnostics)
    
    async def get_completions(self, file_path: str, line: int, character: int) -> List[CompletionItem]:
        """Get code completions"""
        if not self.initialized:
            return []
            
        params = {
            "textDocument": {"uri": f"file://{file_path}"},
            "position": {"line": line, "character": character}
        }
        
        response = await self._send_request("textDocument/completion", params)
        if not response:
            return []
        
        items = response.get("items", []) if isinstance(response, dict) else response
        
        completions = []
        for item in items:
            completion = CompletionItem(
                label=item["label"],
                kind=item.get("kind", 1),
                detail=item.get("detail"),
                documentation=item.get("documentation"),
                insert_text=item.get("insertText", item["label"]),
                sort_text=item.get("sortText")
            )
            completions.append(completion)
        
        return completions
    
    async def get_hover(self, file_path: str, line: int, character: int) -> Optional[str]:
        """Get hover information"""
        if not self.initialized:
            return None
            
        params = {
            "textDocument": {"uri": f"file://{file_path}"},
            "position": {"line": line, "character": character}
        }
        
        response = await self._send_request("textDocument/hover", params)
        if response and "contents" in response:
            contents = response["contents"]
            if isinstance(contents, str):
                return contents
            elif isinstance(contents, dict):
                return contents.get("value", "")
            elif isinstance(contents, list) and contents:
                return contents[0].get("value", "") if isinstance(contents[0], dict) else str(contents[0])
        
        return None
    
    async def goto_definition(self, file_path: str, line: int, character: int) -> Optional[Dict]:
        """Go to definition"""
        if not self.initialized:
            return None
            
        params = {
            "textDocument": {"uri": f"file://{file_path}"},
            "position": {"line": line, "character": character}
        }
        
        response = await self._send_request("textDocument/definition", params)
        if response:
            if isinstance(response, list) and response:
                location = response[0]
            else:
                location = response
                
            if location and "uri" in location:
                return {
                    "uri": location["uri"],
                    "range": location["range"]
                }
        
        return None
    
    async def find_references(self, file_path: str, line: int, character: int) -> List[Dict]:
        """Find references"""
        if not self.initialized:
            return []
            
        params = {
            "textDocument": {"uri": f"file://{file_path}"},
            "position": {"line": line, "character": character},
            "context": {"includeDeclaration": True}
        }
        
        response = await self._send_request("textDocument/references", params)
        if response:
            return response
        
        return []
    
    async def did_open(self, file_path: str, content: str, language_id: str):
        """Notify server that a document was opened"""
        params = {
            "textDocument": {
                "uri": f"file://{file_path}",
                "languageId": language_id,
                "version": 1,
                "text": content
            }
        }
        await self._send_notification("textDocument/didOpen", params)
    
    async def did_change(self, file_path: str, content: str, version: int):
        """Notify server that a document was changed"""
        params = {
            "textDocument": {
                "uri": f"file://{file_path}",
                "version": version
            },
            "contentChanges": [{"text": content}]
        }
        await self._send_notification("textDocument/didChange", params)
    
    async def did_close(self, file_path: str):
        """Notify server that a document was closed"""
        params = {
            "textDocument": {"uri": f"file://{file_path}"}
        }
        await self._send_notification("textDocument/didClose", params)

class LSPManager:
    """Manages multiple language servers"""
    
    def __init__(self):
        self.servers: Dict[str, LSPServer] = {}
        self.diagnostics_callbacks: List[Callable] = []
        
        # Language server configurations
        self.server_configs = {
            "python": {
                "command": ["pylsp"],  # pip install python-lsp-server
                "languages": ["python"]
            },
            "typescript": {
                "command": ["typescript-language-server", "--stdio"],  # npm install -g typescript-language-server
                "languages": ["typescript", "javascript"]
            },
            "javascript": {
                "command": ["typescript-language-server", "--stdio"],
                "languages": ["javascript", "typescript"]
            }
        }
    
    def add_diagnostics_callback(self, callback: Callable):
        """Add callback for diagnostic notifications"""
        self.diagnostics_callbacks.append(callback)
    
    async def start_server(self, language: str, root_path: str) -> bool:
        """Start a language server for the given language"""
        if language in self.servers:
            return True  # Already running
            
        config = self.server_configs.get(language)
        if not config:
            logger.warning(f"No LSP server configured for {language}")
            return False
        
        server = LSPServer(language, config["command"], root_path)
        
        # Set diagnostics callback
        async def diagnostics_callback(uri: str, diagnostics: List[Diagnostic]):
            for callback in self.diagnostics_callbacks:
                try:
                    await callback(uri, diagnostics)
                except Exception as e:
                    logger.error(f"Diagnostics callback error: {e}")
        
        server.diagnostics_callback = diagnostics_callback
        
        if await server.start():
            self.servers[language] = server
            return True
        
        return False
    
    async def stop_server(self, language: str):
        """Stop a language server"""
        if language in self.servers:
            await self.servers[language].stop()
            del self.servers[language]
    
    async def stop_all_servers(self):
        """Stop all language servers"""
        for language in list(self.servers.keys()):
            await self.stop_server(language)
    
    def get_server(self, language: str) -> Optional[LSPServer]:
        """Get a language server"""
        return self.servers.get(language)
    
    async def get_completions(self, file_path: str, line: int, character: int, language: str) -> List[CompletionItem]:
        """Get completions from appropriate language server"""
        server = self.servers.get(language)
        if server:
            return await server.get_completions(file_path, line, character)
        return []
    
    async def get_hover(self, file_path: str, line: int, character: int, language: str) -> Optional[str]:
        """Get hover information"""
        server = self.servers.get(language)
        if server:
            return await server.get_hover(file_path, line, character)
        return None
    
    async def goto_definition(self, file_path: str, line: int, character: int, language: str) -> Optional[Dict]:
        """Go to definition"""
        server = self.servers.get(language)
        if server:
            return await server.goto_definition(file_path, line, character)
        return None
    
    async def find_references(self, file_path: str, line: int, character: int, language: str) -> List[Dict]:
        """Find references"""
        server = self.servers.get(language)
        if server:
            return await server.find_references(file_path, line, character)
        return []
    
    async def did_open_document(self, file_path: str, content: str, language: str):
        """Notify that a document was opened"""
        server = self.servers.get(language)
        if server:
            await server.did_open(file_path, content, language)
    
    async def did_change_document(self, file_path: str, content: str, version: int, language: str):
        """Notify that a document was changed"""
        server = self.servers.get(language)
        if server:
            await server.did_change(file_path, content, version)
    
    async def did_close_document(self, file_path: str, language: str):
        """Notify that a document was closed"""
        server = self.servers.get(language)
        if server:
            await server.did_close(file_path)

# Global LSP manager instance
lsp_manager = LSPManager()