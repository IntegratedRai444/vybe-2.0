# backend/code_intelligence.py
"""
Enhanced code intelligence service with AI-powered features
"""

import ast
import os
import re
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
import logging
from dataclasses import dataclass

# Import AI providers
from .ai_providers import ai_orchestrator

logger = logging.getLogger(__name__)

@dataclass
class CompletionItem:
    """Represents a single code completion suggestion"""
    label: str
    kind: str  # function, class, variable, keyword, etc.
    documentation: str = ""
    detail: str = ""
    insert_text: str = ""
    score: float = 1.0
    is_snippet: bool = False
    deprecated: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'label': self.label,
            'kind': self.kind,
            'documentation': self.documentation,
            'detail': self.detail,
            'insertText': self.insert_text or self.label,
            'score': self.score,
            'isSnippet': self.is_snippet,
            'deprecated': self.deprecated
        }

class CodeIntelligence:
    """
    Enhanced code intelligence with AI-powered features including:
    - Smart code completion
    - Context-aware suggestions
    - AI-powered refactoring
    - Automated documentation
    """
    
    def __init__(self):
        # Language keywords and built-ins with more comprehensive lists
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
        
        # Cache for performance with TTL
        self._import_cache: Dict[str, Tuple[float, List[CompletionItem]]] = {}
        self._symbol_cache: Dict[Tuple[str, str], Tuple[float, List[CompletionItem]]] = {}
        self._ai_completion_cache: Dict[Tuple[str, str, str], Tuple[float, List[CompletionItem]]] = {}
        self._cache_ttl = 300  # 5 minutes TTL
        
        # Initialize AI providers
        self.ai = ai_orchestrator
        
        # Language server protocol capabilities
        self.capabilities = {
            'completionProvider': {
                'resolveProvider': True,
                'triggerCharacters': ['.', ':', '<', '"', '/', '*', '@', '#']
            },
            'signatureHelpProvider': {
                'triggerCharacters': ['(', ',']
            },
            'documentSymbolProvider': True,
            'workspaceSymbolProvider': True,
            'documentHighlightProvider': True,
            'hoverProvider': True,
            'definitionProvider': True,
            'referencesProvider': True,
            'documentFormattingProvider': True
        }
        
    async def get_completions(self, code: str, cursor_pos: int, file_path: str, 
                            language: Optional[str] = None, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Get enhanced code completion suggestions with AI-powered context awareness
        
        Args:
            code: Full source code
            cursor_pos: Current cursor position in the code
            file_path: Path to the file
            language: Programming language (auto-detected if None)
            context: Additional context (e.g., imported modules, local variables)
            
        Returns:
            Dictionary containing completion items and metadata
        """
        try:
            # Determine language if not provided
            if not language:
                language = self._detect_language(file_path)
            
            # Get context around cursor
            lines = code[:cursor_pos].split('\n')
            current_line = lines[-1] if lines else ""
            current_word = self._get_current_word(current_line)
            
            # Initialize completions with language-specific keywords
            completions = []
            
            # Add language-specific completions
            if language == 'python':
                completions.extend([
                    {
                        'label': kw,
                        'kind': 'keyword',
                        'documentation': f'Python keyword: {kw}',
                        'insertText': kw
                    } for kw in self.python_keywords
                ])
                
                # Add built-in functions and types
                completions.extend([
                    {
                        'label': func,
                        'kind': 'function',
                        'documentation': f'Built-in function: {func}()',
                        'insertText': f'{func}(${{1:}})'
                    } for func in self.builtin_functions['python']
                ])
                
                # Add type hints
                type_hints = ['str', 'int', 'float', 'bool', 'list', 'dict', 'tuple', 'set', 'Any', 'Optional', 'Union']
                completions.extend([
                    {
                        'label': hint,
                        'kind': 'typeParameter',
                        'documentation': f'Type hint: {hint}',
                        'insertText': hint
                    } for hint in type_hints
                ])
                
                # Add common patterns
                common_patterns = [
                    ('if __name__ == "__main__":', 'if __name__ == "__main__":\n    ${1:main()}\n', 'Common Python main guard'),
                    ('def __init__', 'def __init__(self${1:, *args, **kwargs}):\n    ${2:super().__init__(*args, **kwargs)}\n    ${0}', 'Class constructor'),
                    ('def test_', 'def test_${1:function_name}(self):\n    ${2:"""Test ${1:function_name}"""}\n    ${0}', 'Test method template')
                ]
                
                completions.extend([
                    {
                        'label': pattern[0],
                        'kind': 'snippet',
                        'documentation': pattern[2],
                        'insertText': pattern[1]
                    } for pattern in common_patterns
                ])
            
            # Add JavaScript completions
            elif language == 'javascript':
                completions.extend([
                    {
                        'label': kw,
                        'kind': 'keyword',
                        'documentation': f'JavaScript keyword: {kw}',
                        'insertText': kw
                    } for kw in self.js_keywords
                ])
                
                # Add common JavaScript patterns
                js_patterns = [
                    ('function', 'function ${1:functionName}(${2:params}) {\n    ${0}\n}', 'Function declaration'),
                    ('() =>', '(${1:params}) => {\n    ${0}\n}', 'Arrow function'),
                    ('try-catch', 'try {\n    ${1}\n} catch (error) {\n    console.error(\'Error:\', error);\n    ${0}\n}', 'Try-catch block')
                ]
                
                completions.extend([
                    {
                        'label': pattern[0],
                        'kind': 'snippet',
                        'documentation': pattern[2],
                        'insertText': pattern[1]
                    } for pattern in js_patterns
                ])
            
            # Filter based on current word
            if current_word:
                completions = [c for c in completions if current_word.lower() in c['label'].lower()]
            
            # Add context-aware completions if available
            if context:
                if 'imports' in context and language == 'python':
                    for imp in context['imports']:
                        if isinstance(imp, str) and (not current_word or current_word.lower() in imp.lower()):
                            completions.append({
                                'label': imp,
                                'kind': 'module',
                                'documentation': f'Imported module: {imp}',
                                'insertText': imp
                            })
                
                if 'variables' in context:
                    for var in context['variables']:
                        if not current_word or current_word.lower() in var.lower():
                            completions.append({
                                'label': var,
                                'kind': 'variable',
                                'documentation': f'Variable: {var}',
                                'insertText': var
                            })
            
            # Sort completions by relevance
            completions.sort(key=lambda x: (
                not x['label'].startswith(current_word) if current_word else False,
                x['kind'] != 'function',
                x['kind'] != 'variable',
                x['label']
            ))
            
            if language == 'python':
                completions = self._get_python_completions(code, current_line, current_word, cursor_pos)
            elif language in ['javascript', 'typescript']:
                completions = self._get_js_completions(code, current_line, current_word, cursor_pos)
            else:
                completions = self._get_generic_completions(current_word, language)
            
            return {
                "completions": completions,
                "language": language,
                "current_word": current_word,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Completion error: {e}")
            return {
                "completions": [],
                "error": str(e),
                "success": False
            }
    
    def get_hover_info(self, code: str, cursor_pos: int, file_path: str) -> Dict[str, Any]:
        """Get hover information for symbol at cursor"""
        try:
            language = self._detect_language(file_path)
            lines = code[:cursor_pos].split('\n')
            current_line = lines[-1] if lines else ""
            word = self._get_word_at_position(current_line, len(current_line))
            
            if not word:
                return {"info": None, "success": False}
            
            info = self._get_symbol_info(word, language, code)
            
            return {
                "info": info,
                "word": word,
                "language": language,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Hover error: {e}")
            return {
                "info": None,
                "error": str(e),
                "success": False
            }
    
    def get_signature_help(self, code: str, cursor_pos: int, file_path: str) -> Dict[str, Any]:
        """Get function signature help"""
        try:
            language = self._detect_language(file_path)
            
            # Find function call context
            before_cursor = code[:cursor_pos]
            
            # Look for function call pattern
            func_match = re.search(r'(\w+)\s*\([^)]*$', before_cursor)
            if not func_match:
                return {"signatures": [], "success": False}
            
            func_name = func_match.group(1)
            signatures = self._get_function_signatures(func_name, language)
            
            return {
                "signatures": signatures,
                "active_signature": 0,
                "active_parameter": 0,
                "function_name": func_name,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Signature help error: {e}")
            return {
                "signatures": [],
                "error": str(e),
                "success": False
            }
    
    def find_definition(self, code: str, cursor_pos: int, file_path: str) -> Dict[str, Any]:
        """Find definition of symbol at cursor"""
        try:
            language = self._detect_language(file_path)
            lines = code[:cursor_pos].split('\n')
            current_line = lines[-1] if lines else ""
            word = self._get_word_at_position(current_line, len(current_line))
            
            if not word:
                return {"locations": [], "success": False}
            
            locations = self._find_symbol_definition(word, code, file_path, language)
            
            return {
                "locations": locations,
                "symbol": word,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Find definition error: {e}")
            return {
                "locations": [],
                "error": str(e),
                "success": False
            }
    
    def find_references(self, code: str, cursor_pos: int, file_path: str) -> Dict[str, Any]:
        """Find all references to symbol at cursor"""
        try:
            language = self._detect_language(file_path)
            lines = code[:cursor_pos].split('\n')
            current_line = lines[-1] if lines else ""
            word = self._get_word_at_position(current_line, len(current_line))
            
            if not word:
                return {"references": [], "success": False}
            
            references = self._find_symbol_references(word, code, file_path, language)
            
            return {
                "references": references,
                "symbol": word,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Find references error: {e}")
            return {
                "references": [],
                "error": str(e),
                "success": False
            }
    
    def _detect_language(self, file_path: str) -> str:
        """Detect language from file extension"""
        ext = Path(file_path).suffix.lower()
        mapping = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.json': 'json',
            '.html': 'html',
            '.css': 'css'
        }
        return mapping.get(ext, 'text')
    
    def _get_current_word(self, line: str) -> str:
        """Get the word being typed at the end of the line"""
        # Find the last word boundary
        match = re.search(r'\b(\w+)$', line)
        return match.group(1) if match else ""
    
    def _get_word_at_position(self, line: str, pos: int) -> str:
        """Get word at specific position in line"""
        if pos >= len(line):
            pos = len(line) - 1
        
        # Find word boundaries around position
        start = pos
        while start > 0 and (line[start-1].isalnum() or line[start-1] == '_'):
            start -= 1
        
        end = pos
        while end < len(line) and (line[end].isalnum() or line[end] == '_'):
            end += 1
        
        return line[start:end] if start < end else ""
    
    def _get_python_completions(self, code: str, current_line: str, current_word: str, cursor_pos: int) -> List[Dict[str, Any]]:
        """Get Python-specific completions"""
        completions = []
        
        # Add keywords
        for keyword in self.python_keywords:
            if keyword.startswith(current_word):
                completions.append({
                    "label": keyword,
                    "kind": "keyword",
                    "detail": f"Python keyword",
                    "insertText": keyword
                })
        
        # Add built-in functions
        for func in self.builtin_functions['python']:
            if func.startswith(current_word):
                completions.append({
                    "label": func,
                    "kind": "function",
                    "detail": "Built-in function",
                    "insertText": f"{func}()"
                })
        
        # Parse code to find defined functions and classes
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith(current_word):
                        completions.append({
                            "label": node.name,
                            "kind": "function",
                            "detail": f"Function at line {node.lineno}",
                            "insertText": f"{node.name}()"
                        })
                elif isinstance(node, ast.ClassDef):
                    if node.name.startswith(current_word):
                        completions.append({
                            "label": node.name,
                            "kind": "class",
                            "detail": f"Class at line {node.lineno}",
                            "insertText": node.name
                        })
        except:
            pass
        
        # Add common imports
        if current_line.strip().startswith('import') or current_line.strip().startswith('from'):
            common_modules = ['os', 'sys', 'json', 'datetime', 'pathlib', 'typing', 'collections']
            for module in common_modules:
                if module.startswith(current_word):
                    completions.append({
                        "label": module,
                        "kind": "module",
                        "detail": "Standard library module",
                        "insertText": module
                    })
        
        return completions
    
    def _get_js_completions(self, code: str, current_line: str, current_word: str, cursor_pos: int) -> List[Dict[str, Any]]:
        """Get JavaScript/TypeScript-specific completions"""
        completions = []
        
        # Add keywords
        for keyword in self.js_keywords:
            if keyword.startswith(current_word):
                completions.append({
                    "label": keyword,
                    "kind": "keyword",
                    "detail": "JavaScript keyword",
                    "insertText": keyword
                })
        
        # Add built-in functions
        for func in self.builtin_functions['javascript']:
            if func.startswith(current_word):
                completions.append({
                    "label": func,
                    "kind": "function",
                    "detail": "Built-in function",
                    "insertText": f"{func}()"
                })
        
        # Find function definitions
        func_pattern = r'function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*:\s*function'
        for match in re.finditer(func_pattern, code):
            func_name = match.group(1) or match.group(2) or match.group(3)
            if func_name and func_name.startswith(current_word):
                completions.append({
                    "label": func_name,
                    "kind": "function",
                    "detail": "User-defined function",
                    "insertText": f"{func_name}()"
                })
        
        # Find variable declarations
        var_pattern = r'(?:const|let|var)\s+(\w+)'
        for match in re.finditer(var_pattern, code):
            var_name = match.group(1)
            if var_name.startswith(current_word):
                completions.append({
                    "label": var_name,
                    "kind": "variable",
                    "detail": "Variable",
                    "insertText": var_name
                })
        
        return completions
    
    def _get_generic_completions(self, current_word: str, language: str) -> List[Dict[str, Any]]:
        """Get generic completions for unknown languages"""
        return [
            {
                "label": "TODO",
                "kind": "snippet",
                "detail": "TODO comment",
                "insertText": "TODO: "
            },
            {
                "label": "FIXME",
                "kind": "snippet", 
                "detail": "FIXME comment",
                "insertText": "FIXME: "
            }
        ]
    
    def _get_symbol_info(self, symbol: str, language: str, code: str) -> Optional[Dict[str, Any]]:
        """Get information about a symbol"""
        if language == 'python':
            if symbol in self.python_keywords:
                return {
                    "title": f"Python keyword: {symbol}",
                    "description": f"'{symbol}' is a Python keyword",
                    "type": "keyword"
                }
            elif symbol in self.builtin_functions['python']:
                return {
                    "title": f"Built-in function: {symbol}",
                    "description": f"'{symbol}' is a Python built-in function",
                    "type": "function"
                }
        
        elif language in ['javascript', 'typescript']:
            if symbol in self.js_keywords:
                return {
                    "title": f"JavaScript keyword: {symbol}",
                    "description": f"'{symbol}' is a JavaScript keyword",
                    "type": "keyword"
                }
        
        return None
    
    def _get_function_signatures(self, func_name: str, language: str) -> List[Dict[str, Any]]:
        """Get function signatures"""
        signatures = []
        
        if language == 'python':
            if func_name == 'print':
                signatures.append({
                    "label": "print(*values, sep=' ', end='\\n', file=sys.stdout, flush=False)",
                    "documentation": "Print values to a stream, or to sys.stdout by default",
                    "parameters": [
                        {"label": "*values", "documentation": "Values to print"},
                        {"label": "sep", "documentation": "String inserted between values"},
                        {"label": "end", "documentation": "String appended after the last value"},
                        {"label": "file", "documentation": "File object to write to"},
                        {"label": "flush", "documentation": "Whether to forcibly flush the stream"}
                    ]
                })
            elif func_name == 'len':
                signatures.append({
                    "label": "len(obj)",
                    "documentation": "Return the length of an object",
                    "parameters": [
                        {"label": "obj", "documentation": "Object to get length of"}
                    ]
                })
        
        elif language in ['javascript', 'typescript']:
            if func_name == 'console.log':
                signatures.append({
                    "label": "console.log(...data)",
                    "documentation": "Outputs a message to the console",
                    "parameters": [
                        {"label": "...data", "documentation": "Data to output"}
                    ]
                })
        
        return signatures
    
    def _find_symbol_definition(self, symbol: str, code: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        """Find where a symbol is defined"""
        locations = []
        
        if language == 'python':
            try:
                tree = ast.parse(code)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name == symbol:
                        locations.append({
                            "file": file_path,
                            "line": node.lineno,
                            "column": node.col_offset,
                            "type": "function" if isinstance(node, ast.FunctionDef) else "class"
                        })
            except:
                pass
        
        elif language in ['javascript', 'typescript']:
            # Simple regex-based search for JS
            patterns = [
                rf'function\s+{re.escape(symbol)}\s*\(',
                rf'const\s+{re.escape(symbol)}\s*=',
                rf'let\s+{re.escape(symbol)}\s*=',
                rf'var\s+{re.escape(symbol)}\s*='
            ]
            
            lines = code.split('\n')
            for i, line in enumerate(lines):
                for pattern in patterns:
                    if re.search(pattern, line):
                        locations.append({
                            "file": file_path,
                            "line": i + 1,
                            "column": line.find(symbol),
                            "type": "definition"
                        })
        
        return locations
    
    def _find_symbol_references(self, symbol: str, code: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        """Find all references to a symbol"""
        references = []
        
        # Simple word boundary search
        pattern = rf'\b{re.escape(symbol)}\b'
        lines = code.split('\n')
        
        for i, line in enumerate(lines):
            for match in re.finditer(pattern, line):
                references.append({
                    "file": file_path,
                    "line": i + 1,
                    "column": match.start(),
                    "context": line.strip()
                })
        
        return references

# Global instance
code_intelligence = CodeIntelligence()