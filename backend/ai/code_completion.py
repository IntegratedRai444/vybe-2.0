"""
AI-powered code completion service with multi-provider support

This module provides intelligent code completion by combining:
- Static analysis of the codebase
- Language-specific keyword and snippet suggestions
- AI-powered contextual completions
- Caching for performance optimization
"""

import os
import re
import time
import logging
import asyncio
import ast
import inspect
import json
import hashlib
from typing import Dict, List, Optional, Any, Tuple, Set, AsyncGenerator, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

# Import AI providers and utilities
from ..ai_providers import ai_orchestrator, AIProvider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type aliases
CodeContext = Dict[str, Any]
CompletionList = List[Dict[str, Any]]
CompletionResponse = Dict[str, Any]
CompletionStream = AsyncGenerator[CompletionResponse, None]

@dataclass
class CompletionItem:
    """Represents a code completion suggestion"""
    label: str
    kind: str  # function, class, variable, keyword, etc.
    documentation: str = ""
    detail: str = ""
    insert_text: str = ""
    score: float = 1.0
    is_snippet: bool = False
    deprecated: bool = False
    commit_characters: List[str] = field(default_factory=lambda: ['.', ':', '(', '[', '"', "'", ',', ' '])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        kind_map = {
            'text': 1,
            'method': 2,
            'function': 3,
            'constructor': 4,
            'field': 5,
            'variable': 6,
            'class': 7,
            'interface': 8,
            'module': 9,
            'property': 10,
            'unit': 11,
            'value': 12,
            'enum': 13,
            'keyword': 14,
            'snippet': 15,
            'color': 16,
            'file': 17,
            'reference': 18,
            'folder': 19,
            'enumMember': 20,
            'constant': 21,
            'struct': 22,
            'event': 23,
            'operator': 24,
            'typeParameter': 25
        }
        
        return {
            'label': self.label,
            'kind': kind_map.get(self.kind.lower(), 1),
            'documentation': self.documentation or self.detail,
            'detail': self.detail or self.documentation,
            'insertText': self.insert_text or self.label,
            'filterText': self.label,
            'sortText': f"{int((1 - self.score) * 100):03d}_{self.label}",
            'preselect': self.score > 0.9,
            'commitCharacters': self.commit_characters if not self.is_snippet else None,
            'data': {
                'score': self.score,
                'isSnippet': self.is_snippet,
                'deprecated': self.deprecated,
                'timestamp': datetime.utcnow().isoformat()
            }
        }

@dataclass
class CompletionRequest:
    """Request object for code completion"""
    file_path: str
    file_content: str
    line: int
    character: int
    language_id: str = ""
    max_results: int = 10
    trigger_character: str = ""
    context: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if not self.language_id:
            self.language_id = self.detect_language()
    
    def detect_language(self) -> str:
        """Detect language from file extension"""
        if not self.file_path:
            return "text"
        
        ext = Path(self.file_path).suffix.lower()
        lang_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.c': 'c',
            '.h': 'c',
            '.cpp': 'cpp',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.sh': 'shell',
            '.bash': 'shell',
            '.zsh': 'shell',
            '.ps1': 'powershell',
            '.sql': 'sql',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.ini': 'ini',
            '.cfg': 'ini',
            '.xml': 'xml',
            '.md': 'markdown',
            '.dockerfile': 'dockerfile',
            'dockerfile': 'dockerfile',
        }
        return lang_map.get(ext, 'text')
    
    def get_context_before_cursor(self, lines_before: int = 5) -> str:
        """Get context before cursor position"""
        if not self.file_content:
            return ""
        
        lines = self.file_content.splitlines()
        start_line = max(0, self.line - lines_before)
        context_lines = lines[start_line:self.line]
        
        # Add the current line up to cursor
        if self.line < len(lines):
            current_line = lines[self.line][:self.character]
            context_lines.append(current_line)
        
        return "\n".join(context_lines)


class CodeCompletionService:
    """
    Advanced code completion service with AI integration
    
    Features:
    - Multi-language support
    - AI-powered contextual completions
    - Smart caching
    - Rate limiting
    - Fallback strategies
    - Snippet support
    """
    
    def __init__(self):
        # Cache for completions with TTL
        self._completion_cache: Dict[str, Tuple[float, List[Dict]]] = {}
        self._cache_ttl = 300  # 5 minutes
        
        # Rate limiting
        self._rate_limits: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                'last_request': 0,
                'requests': 0,
                'window_start': time.time(),
                'max_requests': 60,  # Default rate limit
                'window_seconds': 60
            }
        )
        
        # Language-specific data and configurations
        self.language_data = {
            'python': {
                'keywords': [
                    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
                    'with', 'as', 'import', 'from', 'return', 'yield', 'break', 'continue', 'pass',
                    'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'async', 'await',
                    'raise', 'del', 'global', 'nonlocal', 'assert', 'match', 'case', '_'
                ],
                'builtins': [
                    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
                    'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
                    'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
                    'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
                    'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
                    'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
                    'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
                    'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__import__'
                ],
                'common_imports': [
                    'os', 'sys', 'json', 're', 'dataclasses', 'typing', 'collections',
                    'itertools', 'functools', 'pathlib', 'asyncio', 'logging'
                ]
            },
            'javascript': {
                'keywords': [
                    'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch',
                    'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally',
                    'throw', 'new', 'this', 'class', 'extends', 'import', 'export', 'async', 'await',
                    'static', 'get', 'set', 'of', 'in', 'instanceof', 'typeof', 'void', 'delete',
                    'yield', 'debugger', 'with', 'enum', 'implements', 'interface', 'package',
                    'private', 'protected', 'public', 'super', 'as', 'from'
                ],
                'builtins': [
                    'Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Math', 'Number',
                    'Object', 'RegExp', 'String', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise',
                    'Symbol', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
                    'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
                    'Float64Array', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI',
                    'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape',
                    'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'Infinity', 'NaN',
                    'undefined', 'null', 'globalThis'
                ],
                'common_imports': [
                    'react', 'react-dom', 'next', 'vue', 'vuex', 'vue-router', 'axios',
                    'lodash', 'moment', 'date-fns', 'express', 'http', 'https', 'fs', 'path',
                    'child_process', 'crypto', 'stream', 'util', 'events', 'os', 'url'
                ]
            }
        }
    
    # ===== Core Completion Methods =====
    
    async def get_completions(
        self,
        file_path: str,
        file_content: str,
        line: int,
        character: int,
        language_id: str = "",
        max_results: int = 10,
        trigger_character: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> CompletionList:
        """
        Get code completions at the given position in the file.
        
        Args:
            file_path: Path to the file
            file_content: Full content of the file
            line: Line number (0-based)
            character: Character position in line (0-based)
            language_id: Language identifier (e.g., 'python', 'javascript')
            max_results: Maximum number of completions to return
            trigger_character: Character that triggered the completion
            context: Additional context for the completion
            
        Returns:
            List of completion items
        """
        request = CompletionRequest(
            file_path=file_path,
            file_content=file_content,
            line=line,
            character=character,
            language_id=language_id,
            max_results=max_results,
            trigger_character=trigger_character,
            context=context or {}
        )
        
        # Check cache first
        cache_key = self._generate_cache_key(request)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached[:max_results]
        
        # Get completions from all sources
        completions = []
        
        # 1. Get language-specific completions
        language_completions = self._get_language_completions(request)
        completions.extend(language_completions)
        
        # 2. Get AI-powered completions if enabled
        if self._should_use_ai_completion(request):
            try:
                ai_completions = await self._get_ai_completions(request)
                completions.extend(ai_completions)
            except Exception as e:
                logger.error(f"AI completion failed: {str(e)}")
        
        # 3. Sort and deduplicate
        completions = self._sort_and_dedup(completions)
        
        # 4. Cache the results
        self._add_to_cache(cache_key, completions)
        
        return completions[:max_results]
    
    async def stream_completions(
        self,
        file_path: str,
        file_content: str,
        line: int,
        character: int,
        language_id: str = "",
        max_results: int = 10,
        trigger_character: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> CompletionStream:
        """
        Stream completions as they become available.
        
        Yields:
            Completion responses with 'type' field indicating the update type:
            - 'start': Initial response with metadata
            - 'completion': New completion item
            - 'end': Completion stream ended
            - 'error': Error occurred
        """
        request = CompletionRequest(
            file_path=file_path,
            file_content=file_content,
            line=line,
            character=character,
            language_id=language_id,
            max_results=max_results,
            trigger_character=trigger_character,
            context=context or {}
        )
        
        # Check cache first
        cache_key = self._generate_cache_key(request)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            yield {
                'type': 'start',
                'request_id': cache_key,
                'is_cached': True
            }
            for item in cached[:max_results]:
                yield {
                    'type': 'completion',
                    'item': item,
                    'request_id': cache_key
                }
            yield {'type': 'end', 'request_id': cache_key}
            return
        
        # Start streaming
        yield {
            'type': 'start',
            'request_id': cache_key,
            'is_cached': False
        }
        
        # Get language completions first (immediate)
        language_completions = self._get_language_completions(request)
        for item in language_completions[:max_results]:
            yield {
                'type': 'completion',
                'item': item,
                'source': 'language',
                'request_id': cache_key
            }
        
        # Then get AI completions (streaming)
        if self._should_use_ai_completion(request):
            try:
                async for item in self._stream_ai_completions(request, cache_key):
                    yield item
            except Exception as e:
                logger.error(f"AI streaming error: {str(e)}")
                yield {
                    'type': 'error',
                    'error': str(e),
                    'request_id': cache_key
                }
        
        yield {'type': 'end', 'request_id': cache_key}
    
    # ===== AI Integration =====
    async def _get_ai_completions(
        self,
        request: CompletionRequest
        
        # Build a comprehensive prompt with enhanced context
        prompt = self._build_enhanced_prompt(request)
        
        # Generate completions with appropriate parameters
        response = await provider.generate(
            prompt=prompt,
            max_tokens=256,  # Increased for better multi-line completions
            temperature=0.2,  # Lower temperature for more deterministic output
            top_p=0.95,
            frequency_penalty=0.1,
            presence_penalty=0.1,
            stop=["\n\n", "```", "\nclass ", "\ndef ", "\n#"],  # Stop on common code boundaries
            n=3  # Generate multiple completions
                
            buffer += chunk.get('content', '')
            
            # Try to parse completions from the buffer
            completions = self._parse_ai_response(buffer, request, partial=True)
            if completions:
                for item in completions:
                    yield {
                        'type': 'completion',
                        'item': item.to_dict(),
                        'source': 'ai',
                        'request_id': request_id
                    }
    
    def _create_ai_prompt(self, request: CompletionRequest) -> str:
        """Create a prompt for the AI model"""
        context = request.get_context_before_cursor()
        
        prompt = f"""Complete the following code at the cursor position (marked with |).
        Provide {request.max_results} relevant completions in the format:
        ```
        |completion text|:description of what it does
        ```
        
        Code context:
        ```{request.language_id}
        {context}|
        ```
        
        Completions:
        """
        
        return prompt
    
    def _parse_ai_response(
        self,
        response: str,
        request: CompletionRequest,
        partial: bool = False
    ) -> List[CompletionItem]:
        """Parse AI response into completion items"""
        # This is a simplified parser - in practice, you'd want more robust parsing
        items = []
        
        # Look for code blocks with completions
        code_blocks = re.findall(r'```(?:[a-z]*\n)?(.*?)```', response, re.DOTALL)
        
        for block in code_blocks:
            # Parse each line in the block
            for line in block.split('\n'):
                line = line.strip()
                if '|' in line and ':' in line:
                    # Format: |completion|: description
                    parts = line.split(':', 1)
                    if len(parts) == 2:
                        completion = parts[0].strip(' |')
                        description = parts[1].strip()
                        
                        items.append(CompletionItem(
                            label=completion,
                            kind='snippet' if '\n' in completion else 'text',
                            documentation=description,
                            detail=f"AI Suggestion: {description}",
                            insert_text=completion,
                            score=0.9,  # High score for AI suggestions
                            is_snippet='\n' in completion
                        ))
        
        return items
    
    def _get_system_prompt(self, language_id: str) -> str:
        """Get system prompt for the given language"""
        return f"""You are a helpful coding assistant that provides accurate and relevant code completions.
        - Provide completions that match the code style and context.
        - Include type hints and documentation when applicable.
        - Prefer modern language features and best practices.
        - For {language_id}, follow the standard conventions and style guides.
        - Only return valid code completions.
        """
    
    # ===== Utility Methods =====
    
    def _generate_cache_key(self, request: CompletionRequest) -> str:
        """Generate a cache key for the request"""
        key_parts = [
            request.file_path,
            f"{request.line}:{request.character}",
            request.language_id,
            request.trigger_character,
            request.get_context_before_cursor()[-100:]  # Last 100 chars of context
        ]
        return hashlib.md5(json.dumps(key_parts).encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[List[Dict]]:
        """Get completions from cache if valid"""
        if key in self._completion_cache:
            timestamp, completions = self._completion_cache[key]
            if time.time() - timestamp < self._cache_ttl:
                return completions
            del self._completion_cache[key]
        return None
    
    def _add_to_cache(self, key: str, completions: List[Dict]) -> None:
        """Add completions to cache"""
        self._completion_cache[key] = (time.time(), completions)
        
        # Clean up old cache entries
        now = time.time()
        expired_keys = [k for k, (t, _) in self._completion_cache.items() 
                       if now - t > self._cache_ttl]
        for k in expired_keys:
            del self._completion_cache[k]
    
    def _should_use_ai_completion(self, request: CompletionRequest) -> bool:
        """Determine if AI completion should be used"""
        # Check rate limits
        if not self._check_rate_limit('ai_completion'):
            return False
            
        # Check if AI is enabled for this language
        ai_enabled_languages = {'python', 'javascript', 'typescript', 'java', 'go', 'rust'}
        return request.language_id in ai_enabled_languages
    
    def _check_rate_limit(self, endpoint: str) -> bool:
        """Check and update rate limits"""
        now = time.time()
        limit = self._rate_limits[endpoint]
        
        # Reset window if needed
        if now - limit['window_start'] > limit['window_seconds']:
            limit['window_start'] = now
            limit['requests'] = 0
        
        # Check if we've hit the limit
        if limit['requests'] >= limit['max_requests']:
            return False
            
        limit['requests'] += 1
        limit['last_request'] = now
        return True
    
    def _sort_and_dedup(self, items: List[CompletionItem]) -> List[Dict]:
        """Sort and deduplicate completion items"""
        # Remove duplicates based on label
        unique_items = {}
        for item in items:
            if item.label not in unique_items or item.score > unique_items[item.label].score:
                unique_items[item.label] = item
        
        # Sort by score (descending) and label (ascending)
        sorted_items = sorted(
            unique_items.values(),
            key=lambda x: (-x.score, x.label)
        )
        
        # Convert to dict format
        return [item.to_dict() for item in sorted_items]
    
    def _get_language_completions(self, request: CompletionRequest) -> List[CompletionItem]:
        """Get language-specific completions"""
        # This is a simplified implementation
        # In practice, you'd want to use a language server or static analysis
        
        items = []
        
        # Add language keywords
        if request.language_id in self.language_data:
            lang_data = self.language_data[request.language_id]
            
            # Add keywords
            for keyword in lang_data.get('keywords', []):
                items.append(CompletionItem(
                    label=keyword,
                    kind='keyword',
                    documentation=f"{keyword} keyword",
                    score=0.8
                ))
            
            # Add builtins
            for builtin in lang_data.get('builtins', []):
                items.append(CompletionItem(
                    label=builtin,
                    kind='function',
                    documentation=f"Built-in {builtin} function",
                    score=0.7
                ))
            
            # Add common imports
            for imp in lang_data.get('common_imports', []):
                items.append(CompletionItem(
                    label=imp,
                    kind='module',
                    documentation=f"Import {imp} module",
                    insert_text=f"import {imp}",
                    score=0.6
                ))
        
        return items
            
            # Build/Config files (exact matches)
            **{f: 'dockerfile' for f in ['dockerfile', 'dockerfile.prod', 'dockerfile.dev']},
            **{f: 'makefile' for f in ['makefile', 'gnumakefile', 'makefile.*']},
            **{'.gitignore': 'gitignore'},
            **{'.env': 'dotenv'},
            
            # Documentation
            **{e: 'markdown' for e in ['.md', '.markdown', '.mdown', '.mdwn', '.mkd']},
            **{e: 'restructuredtext' for e in ['.rst', '.rest']},
            
            # Other common files
            **{'.dockerignore': 'dockerignore'},
            **{'.gitattributes': 'gitattributes'},
            **{'.editorconfig': 'editorconfig'},
            **{'.gitmodules': 'gitmodules'}
        }
        
        # Check for exact filename matches first (like Dockerfile, Makefile)
        if filename in language_map:
            return language_map[filename]
            
        # Check for extensions
        if ext in language_map:
            return language_map[ext]
            
        # Check for special cases
        if filename == 'dockerfile':
            return 'dockerfile'
            
        # Default to text if no match found
        return 'text'
    
    def _get_code_context(self, code: str, cursor_pos: int, language: str) -> CodeContext:
        """Extract comprehensive context from the code around the cursor position.
        
        Enhanced to include:
        - Full file AST analysis
        - Import analysis
        - Function/method signatures
        - Class hierarchies
        - Variable scope analysis
        - Type hints information
        - Documentation strings
        - Recent edits context
        
        Args:
            code: The complete source code
            cursor_pos: Current cursor position in the code
            language: Programming language of the code
            
        Returns:
            Dictionary containing comprehensive context information
        """
        context: CodeContext = {
            'imports': set(),  # All imported modules and symbols
            'variables': set(),  # Variables in current scope
            'functions': set(),  # Function names in scope
            'classes': set(),   # Class names in scope
            'language': language.lower(),
            'in_string': False,  # Whether cursor is in a string
            'in_comment': False,  # Whether cursor is in a comment
            'indent_level': 0,  # Current indentation level
            'line': '',  # Current line content
            'line_number': 0,  # Current line number (1-based)
            'scope': [],  # Current scope stack
            'parent_node': None,  # Type of parent node
            'recent_edits': [],  # Recent edit operations
            'type_hints': {},  # Type information for variables
            'docstrings': {},  # Documentation strings for symbols
            'class_hierarchy': {},  # Class inheritance info
            'function_signatures': {},  # Function parameter info
            'imported_symbols': {},  # Mapping of imported symbols to their modules
            'symbol_usage': {},  # Where symbols are used
            'code_structure': {  # Overall code structure
                'imports': [],
                'classes': [],
                'functions': [],
                'global_vars': []
            },
            'cursor_context': {  # Context specific to cursor position
                'surrounding_lines': [],
                'current_block': '',
                'previous_tokens': [],
                'next_tokens': [],
                'surrounding_code': ''
            }
        }
        
        try:
            # Get lines and cursor position
            lines = code.splitlines()
            cursor_line = code[:cursor_pos].count('\n')
            context['line_number'] = cursor_line + 1  # 1-based line number
            
            # Get current line and surrounding context
            start_line = max(0, cursor_line - 2)
            end_line = min(len(lines), cursor_line + 3)
            context['cursor_context']['surrounding_lines'] = lines[start_line:end_line]
            
            # Set current line and calculate indentation
            if 0 <= cursor_line < len(lines):
                context['line'] = lines[cursor_line]
                context['indent_level'] = len(context['line']) - len(context['line'].lstrip())
            
            # Get surrounding code block (simplified)
            if 0 <= cursor_line < len(lines):
                # Get the current block by finding the nearest empty lines
                block_start = cursor_line
                block_end = cursor_line
                
                # Find block start
                while block_start > 0 and lines[block_start - 1].strip():
                    block_start -= 1
                
                # Find block end
                while block_end < len(lines) - 1 and lines[block_end + 1].strip():
                    block_end += 1
                
                context['cursor_context']['current_block'] = '\n'.join(lines[block_start:block_end + 1])
                
                # Get surrounding code (wider context)
                context_start = max(0, cursor_line - 10)
                context_end = min(len(lines), cursor_line + 10)
                context['cursor_context']['surrounding_code'] = '\n'.join(lines[context_start:context_end])
            
            # Parse language-specific context
            if language == 'python':
                self._extract_python_context(code, cursor_pos, context)
            
            # Detect if we're in a string or comment
            self._detect_strings_and_comments(code, cursor_pos, context)
            
        except Exception as e:
            logger.debug(f"Error extracting context: {e}", exc_info=True)
        
        return context
        
    def _extract_python_context(self, code: str, cursor_pos: int, context: CodeContext) -> None:
        """Extract Python-specific context using AST, including:
        - Class hierarchies and inheritance
        - Function/method signatures
        - Type hints and docstrings
        - Variable scope and usage
        - Import analysis
        """
        try:
            # Parse the complete code with type comments
            tree = ast.parse(code, type_comments=True)
            cursor_lineno = context['line_number']
            
            # Track the current scope and position
            current_scope = []
            
            # First pass: build class hierarchy and function signatures
            for node in ast.walk(tree):
                # Track imports with aliases and from-imports
                if isinstance(node, ast.Import):
                    for name in node.names:
                        module_name = name.name.split('.')[0]
                        context['imports'].add(module_name)
                        if name.asname:
                            context['imported_symbols'][name.asname] = module_name
                        
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        module_name = node.module.split('.')[0]
                        context['imports'].add(module_name)
                        for name in node.names:
                            full_name = f"{module_name}.{name.name}" if name.name != '*' else module_name
                            context['imported_symbols'][name.name] = full_name
                
                # Track class definitions and hierarchy
                if isinstance(node, ast.ClassDef):
                    class_info = {
                        'name': node.name,
                        'bases': [ast.unparse(base) for base in node.bases],
                        'methods': [],
                        'attributes': [],
                        'docstring': ast.get_docstring(node) or '',
                        'lineno': node.lineno,
                        'end_lineno': getattr(node, 'end_lineno', node.lineno)
                    }
                    
                    # Add to class hierarchy
                    context['class_hierarchy'][node.name] = class_info
                    context['code_structure']['classes'].append(class_info)
                    
                    # Track class variables and methods
                    for item in node.body:
                        if isinstance(item, ast.FunctionDef) or isinstance(item, ast.AsyncFunctionDef):
                            method_info = self._extract_function_info(item, is_method=True)
                            class_info['methods'].append(method_info)
                        elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                            class_info['attributes'].append({
                                'name': item.target.id,
                                'type': ast.unparse(item.annotation) if item.annotation else 'Any',
                                'value': ast.unparse(item.value) if item.value else None
                            })
                
                # Track function/method definitions
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    func_info = self._extract_function_info(node)
                    context['function_signatures'][node.name] = func_info
                    context['code_structure']['functions'].append(func_info)
            
            # Second pass: analyze variable usage and type hints
            self._analyze_variable_usage(tree, cursor_lineno, context)
            
            # Third pass: find the current scope
            self._find_current_scope(tree, cursor_lineno, context)
            
        except Exception as e:
            logger.debug(f"Error in Python context extraction: {e}", exc_info=True)
    
    def _extract_function_info(self, node: Union[ast.FunctionDef, ast.AsyncFunctionDef], 
                             is_method: bool = False) -> Dict[str, Any]:
        """Extract detailed information about a function or method."""
        # Get return type annotation
        return_type = 'None'
        if node.returns:
            return_type = ast.unparse(node.returns)
        elif getattr(node, 'type_comment', None):
            # Try to extract return type from type comment
            type_comment = node.type_comment
            if '->' in type_comment:
                return_type = type_comment.split('->')[-1].strip()
        
        # Process parameters
        params = []
        for param in node.args.args:
            param_info = {
                'name': param.arg,
                'type': ast.unparse(param.annotation) if param.annotation else 'Any',
                'default': ast.unparse(param.default) if param.default else None,
                'kind': 'param'
            }
            params.append(param_info)
        
        # Process keyword-only arguments
        for param in node.args.kwonlyargs:
            param_info = {
                'name': param.arg,
                'type': ast.unparse(param.annotation) if param.annotation else 'Any',
                'default': ast.unparse(param.default) if param.default else None,
                'kind': 'keyword_only'
            }
            params.append(param_info)
        
        # Process varargs and kwargs
        if node.args.vararg:
            params.append({
                'name': f"*{node.args.vararg.arg}",
                'type': 'Any',
                'default': None,
                'kind': 'varargs'
            })
        
        if node.args.kwarg:
            params.append({
                'name': f"**{node.args.kwarg.arg}",
                'type': 'Any',
                'default': None,
                'kind': 'varkwargs'
            })
        
        # Extract docstring
        docstring = ast.get_docstring(node) or ''
        
        return {
            'name': node.name,
            'async': isinstance(node, ast.AsyncFunctionDef),
            'params': params,
            'returns': return_type,
            'docstring': docstring,
            'decorators': [ast.unparse(dec) for dec in node.decorator_list],
            'is_method': is_method,
            'lineno': node.lineno,
            'end_lineno': getattr(node, 'end_lineno', node.lineno)
        }
    
    def _analyze_variable_usage(self, tree: ast.AST, cursor_lineno: int, context: CodeContext) -> None:
        """Analyze variable usage and type hints in the code."""
        for node in ast.walk(tree):
            # Track variable assignments
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        context['variables'].add(target.id)
                        
                        # Try to infer type from value
                        if isinstance(node.value, ast.Call):
                            if isinstance(node.value.func, ast.Name):
                                context['type_hints'][target.id] = node.value.func.id
                        elif isinstance(node.value, ast.Constant):
                            context['type_hints'][target.id] = type(node.value.value).__name__
            
            # Track function arguments
            elif isinstance(node, ast.arg):
                if node.annotation:
                    context['type_hints'][node.arg] = ast.unparse(node.annotation)
    
    def _find_current_scope(self, tree: ast.AST, cursor_lineno: int, context: CodeContext) -> None:
        """Find the current scope at the cursor position."""
        try:
            for node in ast.walk(tree):
                if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
                    start = node.lineno
                    end = getattr(node, 'end_lineno', start)
                    
                    if start <= cursor_lineno <= end:
                        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                            context['scope'].append(node.name)
                            if isinstance(node, ast.ClassDef):
                                context['classes'].add(node.name)
                                context['parent_node'] = 'class'
                            else:
                                context['functions'].add(node.name)
                                context['parent_node'] = 'function'
                

        except (SyntaxError, ValueError) as e:
            # Handle incomplete code gracefully
            logger.debug(f"Error parsing Python code: {e}")
            
        # Extract variables in scope
        self._extract_variables_in_scope(tree, cursor_lineno, context)
    
    def _extract_variables_in_scope(self, tree: ast.AST, cursor_lineno: int, context: CodeContext) -> None:
        """Extract variables that are in scope at the cursor position."""
        for node in ast.walk(tree):
            # Get variables from assignments
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if hasattr(node, 'lineno') and node.lineno <= cursor_lineno:
                            context['variables'].add(target.id)
            # Get function arguments
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if hasattr(node, 'args') and hasattr(node, 'lineno') and node.lineno <= cursor_lineno:
                    for arg in node.args.args:
                        context['variables'].add(arg.arg)
    
    def _detect_strings_and_comments(self, code: str, cursor_pos: int, context: CodeContext) -> None:
        """Detect if cursor is inside a string or comment."""
        in_string = None  # Track the type of string ('"', "'", or None)
        in_comment = False
        in_multiline_comment = False
        i = 0
        
        while i < cursor_pos and i < len(code):
            char = code[i]
            next_char = code[i+1] if i+1 < len(code) else ''
            
            if not in_string and not in_comment and not in_multiline_comment:
                # Check for string start
                if char in ("'", '"'):
                    in_string = char
                # Check for single-line comment
                elif char == '#' and not in_string:
                    in_comment = True
                # Check for multi-line comment start
                elif char == '/' and next_char == '*':
                    in_multiline_comment = True
                    i += 1  # Skip the next character
                # Check for multi-line string (docstring)
                elif char in ("'\""', '\"\"\"'):
                    if i + 3 <= len(code) and code[i:i+3] in ("'\""", '\"\"\"'):
                        in_string = code[i:i+3]
                        i += 2  # Skip the next two characters
            
            # Handle string termination
            elif in_string:
                # Check for end of string (handling escaped quotes)
                if char == in_string and (i == 0 or code[i-1] != '\\'):
                    # Handle triple-quoted strings
                    if len(in_string) == 3 and i + 2 < len(code) and code[i:i+3] == in_string:
                        i += 2  # Skip the next two characters
                        in_string = None
                    # Handle single-quoted strings
                    elif len(in_string) == 1:
                        in_string = None
            
            # Handle comment termination
            elif in_comment and char == '\n':
                in_comment = False
            
            # Handle multi-line comment termination
            elif in_multiline_comment and char == '*' and next_char == '/':
                in_multiline_comment = False
                i += 1  # Skip the next character
            
            i += 1
        
        # Update context
        context['in_string'] = in_string is not None
        context['in_comment'] = in_comment or in_multiline_comment

    def _generate_multi_line_completions(self, context: CodeContext) -> List[CompletionItem]:
        """Generate multi-line completion suggestions based on context."""
        completions = []
        language = context.get('language', 'python')
        
        if language == 'python':
            # Common Python patterns
            completions.extend([
                CompletionItem(
                    label="if __name__ == '__main__':",
                    kind='snippet',
                    detail="Python main guard",
                    insert_text="if __name__ == '__main__':\n    ${1:main()}$0",
                    is_snippet=True,
                    score=0.9
                ),
                CompletionItem(
                    label="class ${1:ClassName}(${2:BaseClass}):",
                    kind='snippet',
                    detail="Python class definition",
                    insert_text="class ${1:ClassName}(${2:object}):\n    \"\"\"${3:Docstring for $1.}\"\"\"\n    \n    def __init__(self${4:, ${5:args}}):\n        \"\"\"Initialize $1.\n        \n        Args:\n            $5: ${6:Description of $5}.\n        \"\"\"\n        ${7:super(${1:ClassName}, self).__init__()}\n        $0",
                    is_snippet=True,
                    score=0.9
                ),
                CompletionItem(
                    label="def ${1:function_name}(${2:args}):",
                    kind='snippet',
                    detail="Python function definition",
                    insert_text="def ${1:function_name}(${2:args}) -> ${3:return_type}:\n    \"\"\"${4:Docstring for $1.}\n    \n    Args:\n        $2: ${5:Description of args}.\n    \n    Returns:\n        $3: ${6:Description of return value}.\n    \"\"\"\n    $0",
                    is_snippet=True,
                    score=0.9
                ),
                CompletionItem(
                    label="for ${1:item} in ${2:iterable}:",
                    kind='snippet',
                    detail="Python for loop",
                    insert_text="for ${1:item} in ${2:iterable}:\n    ${3:pass}",
                    is_snippet=True,
                    score=0.8
                ),
                CompletionItem(
                    label="with ${1:context} as ${2:var}:",
                    kind='snippet',
                    detail="Python context manager",
                    insert_text="with ${1:context} as ${2:var}:\n    ${3:pass}",
                    is_snippet=True,
                    score=0.8
                ),
                CompletionItem(
                    label="try/except block",
                    kind='snippet',
                    detail="Python try/except block",
                    insert_text="try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:print(f\"An error occurred: {e}\")}\nelse:\n    ${5:pass}\nfinally:\n    ${6:pass}",
                    is_snippet=True,
                    score=0.8
                )
            ])
            
            # Add class-specific completions
            for class_name in context.get('classes', []):
                completions.append(
                    CompletionItem(
                        label=f"{class_name} class",
                        kind='snippet',
                        detail=f"{class_name} class definition",
                        insert_text=f"class {class_name}({class_name}):\n    \"\"\"Extended {class_name} class.\"\"\"\n    \n    def __init__(self, *args, **kwargs):\n        super().__init__(*args, **kwargs)\n        $0",
                        is_snippet=True,
                        score=0.85
                    )
                )
        
        return completions

    async def get_completions(
        self,
        code: str,
        cursor_pos: int,
        file_path: str,
        language: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Get code completion suggestions with AI-powered context awareness
        
        Args:
            code: The complete source code
            cursor_pos: Current cursor position in the code
            file_path: Path to the file being edited
            language: Programming language (auto-detected if None)
            context: Additional context (e.g., imported modules, local variables)
            
        Returns:
            List of completion items as dictionaries
        """
        try:
            # Rate limiting with enhanced debouncing
            current_time = time.time()
            cache_key = f"{file_path}:{cursor_pos}:{hash(code[:cursor_pos])}"
            
            if (cache_key in self._last_request_time and 
                current_time - self._last_request_time[cache_key] < 0.1):  # 100ms debounce
                return []
            
            self._last_request_time[cache_key] = current_time
            
            # Detect language if not provided
            if not language:
                language = self.detect_language(file_path)
            
            # Get context around cursor with enhanced analysis
            context = self._get_code_context(code, cursor_pos, language)
            
            # Get the current line and cursor position
            lines = code[:cursor_pos].split('\n')
            current_line = lines[-1] if lines else ""
            current_word = self._get_current_word(current_line)
            
            # Get prefix (text before cursor) and suffix (text after cursor)
            line_start = cursor_pos - len(current_line) if lines else 0
            column = cursor_pos - line_start
            prefix = current_line[:column]
            suffix = current_line[column:]
            
            # Check if we're in a string or comment
            if context.get('in_comment', False) or context.get('in_string', False):
                # Only provide basic completions in comments/strings
                return []
            
            # Get completions from cache if available
            cached = self._completion_cache.get(cache_key)
            if cached and (current_time - cached[0]) < self._cache_ttl:
                return cached[1]
            
            # Initialize completions list
            completions: List[Dict[str, Any]] = []
            
            # 1. Get multi-line completions based on context
            multi_line_completions = self._generate_multi_line_completions(context)
            completions.extend([c.to_dict() for c in multi_line_completions])
            
            # 2. Get AI-powered completions if available
            if ai_orchestrator.is_available():
                try:
                    ai_completions = await self._get_ai_completions(
                        code, cursor_pos, file_path, language, context
                    )
                    completions.extend(ai_completions)
                except Exception as e:
                    logger.warning(f"AI completion failed: {e}", exc_info=True)
            
            # 3. Add language-specific completions with enhanced context awareness
            local_completions = self._get_local_completions(prefix, language, context)
            completions.extend(local_completions)
            
            # 4. Filter and sort completions
            if current_word:
                completions = [
                    c for c in completions 
                    if current_word.lower() in c.get('label', '').lower()
                ]
            
            # Sort by score and limit results
            completions.sort(key=lambda x: -x.get('score', 0))
            completions = completions[:50]  # Limit to top 50
            
            # Cache the results with context information
            self._completion_cache[cache_key] = (current_time, completions)
            
            return completions
            
        except Exception as e:
            logger.error(f"Error in get_completions: {e}")
            return []
    
    async def _get_ai_completions(
        self,
        code: str,
        cursor_pos: int,
        file_path: str,
        language: str,
        context: Dict
    ) -> List[Dict[str, Any]]:
        """Get completions from AI provider"""
        try:
            # Get context around cursor
            start_line = max(0, code[:cursor_pos].count('\n') - 5)
            end_line = code[cursor_pos:].count('\n') + code[:cursor_pos].count('\n') + 5
            lines = code.splitlines()
            context_lines = lines[start_line:end_line]
            
            # Prepare the prompt
            prompt = self._build_ai_prompt(
                code=code,
                cursor_pos=cursor_pos,
                language=language,
                context=context,
                context_lines=context_lines
            )
            
            # Get completion from AI
            response = await ai_orchestrator.generate(
                prompt=prompt,
                system_prompt=f"You are a helpful AI assistant that provides accurate and concise code completions for {language}.",
                max_tokens=100,
                temperature=0.2,
                stop=['\n', '  ']
            )
            
            # Parse the response into completion items
            completions = self._parse_ai_response(response, language)
            return completions
            
        except Exception as e:
            logger.error(f"Error in _get_ai_completions: {e}")
            return []
    
    def _build_ai_prompt(
        self,
        code: str,
        cursor_pos: int,
        language: str,
        context: Dict,
        context_lines: List[str]
    ) -> str:
        """Build a prompt for the AI model"""
        prompt_parts = [
            f"Complete the code at the cursor position (marked with |).",
            f"Language: {language}",
            ""
        ]
        
        # Add context
        if 'imports' in context:
            prompt_parts.append("// Imported modules:")
            for imp in context.get('imports', []):
                prompt_parts.append(f"//   {imp}")
            prompt_parts.append("")
        
        # Add code with cursor position
        prompt_parts.append("// Code context:")
        for i, line in enumerate(context_lines):
            if i == cursor_pos:
                prompt_parts.append(f"{line}|  // <-- Cursor position")
            else:
                prompt_parts.append(line)
        
        prompt_parts.extend([
            "",
            "// Provide 3-5 possible completions for the cursor position:",
            "1. "
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_ai_response(self, response: str, language: str) -> List[Dict[str, Any]]:
        """Parse AI response into completion items"""
        completions = []
        
        # Simple parsing - each line starting with a number is a completion
        for line in response.split('\n'):
            line = line.strip()
            if not line or not line[0].isdigit():
                continue
                
            # Remove the number prefix
            completion = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
            if not completion:
                continue
                
            # Create completion item
            completions.append({
                'label': completion,
                'kind': self._determine_completion_kind(completion, language),
                'detail': 'AI Suggestion',
                'documentation': f'AI-generated completion for {language}',
                'score': 0.8,  # Slightly lower than built-ins
                'insertText': completion,
                'data': {'source': 'ai'}
            })
        
        return completions
    
    def _get_local_completions(
        self, 
        prefix: str, 
        language: str, 
        context: CodeContext
    ) -> List[Dict[str, Any]]:
        """Get context-aware local completions with enhanced suggestions."""
        completions = []
        lang_data = self.language_data.get(language, {})
        
        # Get context information
        in_import = context.get('line', '').strip().startswith(('import ', 'from '))
        in_class = any(marker in context.get('line', '') for marker in ['class ', 'def '])
        in_function = 'def ' in context.get('line', '')
        
        # 1. Add keywords (context-aware filtering)
        if not in_import:  # Don't show keywords in import statements
            for kw in lang_data.get('keywords', []):
                if not prefix or kw.lower().startswith(prefix.lower()):
                    # Adjust score based on context
                    score = 1.0
                    
                    # Increase score for likely keywords in current context
                    if in_class and kw in ('def', 'self', 'super', 'classmethod', 'staticmethod'):
                        score = 1.1
                    elif in_function and kw in ('return', 'yield', 'raise'):
                        score = 1.1
                    elif kw in ('True', 'False', 'None') and '=' in context.get('line', ''):
                        score = 1.1
                    
                    completions.append({
                        'label': kw,
                        'kind': 'keyword',
                        'documentation': f'{language} keyword',
                        'score': score,
                        'insertText': kw
                    })
        
        # 2. Add built-ins with enhanced documentation
        if not in_import:  # Don't show built-ins in import statements
            for func in lang_data.get('builtins', []):
                if not prefix or func.lower().startswith(prefix.lower()):
                    # Get function signature and docstring if available
                    try:
                        if language == 'python' and func in __builtins__:
                            func_obj = __builtins__.get(func)
                            doc = (func_obj.__doc__ or '').split('\n')[0] if func_obj else ''
                            detail = f"{func}{inspect.signature(func_obj) if hasattr(func_obj, '__signature__') else '()'}"
                        else:
                            doc = f'Built-in {language} function'
                            detail = f'{func}()'
                    except Exception:
                        doc = f'Built-in {language} function'
                        detail = f'{func}()'
                    
                    completions.append({
                        'label': f"{func}()",
                        'kind': 'function',
                        'documentation': doc,
                        'detail': detail,
                        'score': 0.95,
                        'insertText': f"{func}($0)",
                        'is_snippet': True
                    })
        
        # 3. Add common imports with context awareness
        if in_import or not prefix:  # Only show imports at the start or when explicitly typing
            for imp in lang_data.get('common_imports', []):
                if not prefix or imp.lower().startswith(prefix.lower()):
                    # Adjust score based on context
                    score = 0.9
                    
                    # Increase score for imports that match the current file's context
                    if context.get('imports') and imp in context['imports']:
                        score = 1.0
                    
                    completions.append({
                        'label': imp,
                        'kind': 'module',
                        'documentation': f'Common {language} module',
                        'score': score,
                        'insertText': imp
                    })
        
        # 4. Add context-aware completions
        if language == 'python' and not in_import:
            # Add class names when defining inheritance
            if 'class ' in context.get('line', '') and '(' in context.get('line', ''):
                for class_name in context.get('classes', []):
                    if not prefix or class_name.lower().startswith(prefix.lower()):
                        completions.append({
                            'label': class_name,
                            'kind': 'class',
                            'documentation': f'Class in current file',
                            'score': 1.05,  # Higher score for local classes
                            'insertText': class_name
                        })
            
            # Add local variables and functions
            for var in context.get('variables', set()):
                if not prefix or var.lower().startswith(prefix.lower()):
                    completions.append({
                        'label': var,
                        'kind': 'variable',
                        'documentation': 'Local variable',
                        'score': 1.02,  # Slightly higher than built-ins
                        'insertText': var
                    })
            
            for func in context.get('functions', set()):
                if not prefix or func.lower().startswith(prefix.lower()):
                    completions.append({
                        'label': f"{func}()",
                        'kind': 'function',
                        'documentation': 'Function in current file',
                        'score': 1.03,  # Higher score for local functions
                        'insertText': f"{func}($0)",
                        'is_snippet': True
                    })
        
        # Remove duplicates while preserving order
        seen = set()
        unique_completions = []
        for comp in completions:
            if comp['label'] not in seen:
                seen.add(comp['label'])
                unique_completions.append(comp)
        
        return unique_completions
    
    def _get_current_word(self, line: str) -> str:
        """Get the current word at cursor position"""
        if not line:
            return ""
            
        # Match word characters and dots (for method chaining)
        match = re.search(r'([\w.]+)$', line)
        return match.group(1) if match else ""
    
    def _get_cache_key(self, prefix: str, language: str, context: Dict) -> str:
        """Generate a cache key for completions"""
        import json
        context_str = json.dumps(context, sort_keys=True) if context else ""
        return f"{language}:{prefix}:{context_str}"
    
    def _determine_completion_kind(self, text: str, language: str) -> str:
        """Determine the kind of completion"""
        text = text.strip()
        
        # Check for function/method call
        if '(' in text and ')' in text:
            return 'function'
            
        # Check for class definition
        if language == 'python' and text.startswith('class '):
            return 'class'
            
        # Check for import statement
        if any(text.startswith(kw) for kw in ['import ', 'from ', 'using ', 'require ']):
            return 'module'
            
        # Default to variable
        return 'variable'

# Global instance
code_completion = CodeCompletionService()
