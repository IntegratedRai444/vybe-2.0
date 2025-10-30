# backend/linters.py
"""
Code linters for different languages
"""

import subprocess
import tempfile
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class CodeLinter:
    """Handles code linting for multiple languages"""
    
    def __init__(self):
        self.linters = {
            'python': self.lint_python,
            'javascript': self.lint_javascript,
            'typescript': self.lint_typescript,
            'json': self.lint_json,
            'html': self.lint_html,
            'css': self.lint_css
        }
    
    def lint_file(self, file_path: str, project_root: str) -> Dict[str, Any]:
        """Lint a single file"""
        try:
            path = Path(file_path)
            if not path.exists():
                return {
                    "diagnostics": [],
                    "error": "File not found",
                    "success": False
                }
            
            # Determine language from extension
            ext = path.suffix.lower().lstrip('.')
            language = self.get_language_from_extension(ext)
            
            if language not in self.linters:
                return {
                    "diagnostics": [],
                    "error": f"No linter available for {language}",
                    "success": False
                }
            
            # Read file content
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                return {
                    "diagnostics": [],
                    "error": f"Could not read file: {str(e)}",
                    "success": False
                }
            
            # Run linter
            linter = self.linters[language]
            result = linter(str(path), content, project_root)
            
            return {
                "diagnostics": result.get("diagnostics", []),
                "error": result.get("error"),
                "success": result.get("success", True),
                "linter_used": result.get("linter_used", language)
            }
            
        except Exception as e:
            logger.error(f"Linting error for {file_path}: {e}")
            return {
                "diagnostics": [],
                "error": str(e),
                "success": False
            }
    
    def lint_project(self, project_root: str) -> Dict[str, Any]:
        """Lint entire project"""
        try:
            project_path = Path(project_root)
            if not project_path.exists():
                return {
                    "file_diagnostics": {},
                    "summary": {"total_files": 0, "total_issues": 0},
                    "error": "Project root not found",
                    "success": False
                }
            
            file_diagnostics = {}
            total_files = 0
            total_issues = 0
            
            # Find all lintable files
            for file_path in project_path.rglob('*'):
                if file_path.is_file() and not self.should_ignore_file(file_path, project_path):
                    ext = file_path.suffix.lower().lstrip('.')
                    language = self.get_language_from_extension(ext)
                    
                    if language in self.linters:
                        result = self.lint_file(str(file_path), project_root)
                        if result.get("success"):
                            diagnostics = result.get("diagnostics", [])
                            if diagnostics:
                                file_diagnostics[str(file_path.relative_to(project_path))] = diagnostics
                                total_issues += len(diagnostics)
                            total_files += 1
            
            return {
                "file_diagnostics": file_diagnostics,
                "summary": {
                    "total_files": total_files,
                    "total_issues": total_issues,
                    "files_with_issues": len(file_diagnostics)
                },
                "error": None,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Project linting error for {project_root}: {e}")
            return {
                "file_diagnostics": {},
                "summary": {"total_files": 0, "total_issues": 0},
                "error": str(e),
                "success": False
            }
    
    def get_language_from_extension(self, ext: str) -> str:
        """Map file extension to language"""
        mapping = {
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'json': 'json',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'css',
            'sass': 'css'
        }
        return mapping.get(ext, 'unknown')
    
    def should_ignore_file(self, file_path: Path, project_root: Path) -> bool:
        """Check if file should be ignored"""
        ignore_patterns = [
            'node_modules', '__pycache__', '.git', 'dist', 'build',
            '.vscode', '.idea', 'venv', 'env', '.env'
        ]
        
        relative_path = str(file_path.relative_to(project_root))
        return any(pattern in relative_path for pattern in ignore_patterns)
    
    def lint_python(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint Python code"""
        diagnostics = []
        
        # Try flake8 first
        try:
            result = subprocess.run(
                ['flake8', '--format=json', file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                try:
                    flake8_output = json.loads(result.stdout)
                    for issue in flake8_output:
                        diagnostics.append({
                            "line": issue.get("line_number", 1),
                            "column": issue.get("column_number", 1),
                            "message": issue.get("text", ""),
                            "severity": "warning" if issue.get("code", "").startswith("W") else "error",
                            "source": "flake8",
                            "code": issue.get("code", "")
                        })
                except json.JSONDecodeError:
                    pass
            
            return {
                "diagnostics": diagnostics,
                "success": True,
                "linter_used": "flake8"
            }
            
        except (subprocess.TimeoutExpired, FileNotFoundError):
            # Fallback to basic Python syntax check
            return self.basic_python_lint(content)
    
    def basic_python_lint(self, content: str) -> Dict[str, Any]:
        """Basic Python syntax checking"""
        diagnostics = []
        
        try:
            import ast
            ast.parse(content)
        except SyntaxError as e:
            diagnostics.append({
                "line": e.lineno or 1,
                "column": e.offset or 1,
                "message": str(e.msg),
                "severity": "error",
                "source": "python-ast",
                "code": "syntax-error"
            })
        except Exception as e:
            diagnostics.append({
                "line": 1,
                "column": 1,
                "message": f"Parse error: {str(e)}",
                "severity": "error",
                "source": "python-ast",
                "code": "parse-error"
            })
        
        return {
            "diagnostics": diagnostics,
            "success": True,
            "linter_used": "python-ast"
        }
    
    def lint_javascript(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint JavaScript code"""
        diagnostics = []
        
        # Try ESLint
        try:
            result = subprocess.run(
                ['npx', 'eslint', '--format=json', file_path],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=project_root
            )
            
            if result.stdout:
                try:
                    eslint_output = json.loads(result.stdout)
                    for file_result in eslint_output:
                        for message in file_result.get("messages", []):
                            severity = "error" if message.get("severity") == 2 else "warning"
                            diagnostics.append({
                                "line": message.get("line", 1),
                                "column": message.get("column", 1),
                                "message": message.get("message", ""),
                                "severity": severity,
                                "source": "eslint",
                                "code": message.get("ruleId", "")
                            })
                except json.JSONDecodeError:
                    pass
            
            return {
                "diagnostics": diagnostics,
                "success": True,
                "linter_used": "eslint"
            }
            
        except (subprocess.TimeoutExpired, FileNotFoundError):
            # Fallback to basic JS syntax check
            return self.basic_js_lint(content)
    
    def lint_typescript(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint TypeScript code"""
        # For now, use the same as JavaScript
        return self.lint_javascript(file_path, content, project_root)
    
    def basic_js_lint(self, content: str) -> Dict[str, Any]:
        """Basic JavaScript syntax checking"""
        diagnostics = []
        
        # Basic syntax checks
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for common issues
            if stripped.endswith(';;'):
                diagnostics.append({
                    "line": i,
                    "column": len(line) - 1,
                    "message": "Unnecessary semicolon",
                    "severity": "warning",
                    "source": "basic-js",
                    "code": "unnecessary-semicolon"
                })
            
            # Check for missing semicolons (basic)
            if (stripped and 
                not stripped.endswith((';', '{', '}', ':', ',')) and
                not stripped.startswith(('if', 'for', 'while', 'function', 'class', '//', '/*')) and
                not any(keyword in stripped for keyword in ['return', 'break', 'continue'])):
                diagnostics.append({
                    "line": i,
                    "column": len(line),
                    "message": "Missing semicolon",
                    "severity": "warning",
                    "source": "basic-js",
                    "code": "missing-semicolon"
                })
        
        return {
            "diagnostics": diagnostics,
            "success": True,
            "linter_used": "basic-js"
        }
    
    def lint_json(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint JSON code"""
        diagnostics = []
        
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            diagnostics.append({
                "line": e.lineno,
                "column": e.colno,
                "message": e.msg,
                "severity": "error",
                "source": "json",
                "code": "json-error"
            })
        
        return {
            "diagnostics": diagnostics,
            "success": True,
            "linter_used": "json"
        }
    
    def lint_html(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint HTML code"""
        diagnostics = []
        
        # Basic HTML validation
        lines = content.split('\n')
        tag_stack = []
        
        for i, line in enumerate(lines, 1):
            # Simple tag matching
            import re
            tags = re.findall(r'<(/?)(\w+)[^>]*>', line)
            
            for is_closing, tag_name in tags:
                if is_closing:
                    if not tag_stack or tag_stack[-1] != tag_name:
                        diagnostics.append({
                            "line": i,
                            "column": 1,
                            "message": f"Unexpected closing tag: {tag_name}",
                            "severity": "error",
                            "source": "html",
                            "code": "unexpected-closing-tag"
                        })
                    elif tag_stack:
                        tag_stack.pop()
                else:
                    # Self-closing tags
                    if tag_name.lower() not in ['img', 'br', 'hr', 'input', 'meta', 'link']:
                        tag_stack.append(tag_name)
        
        # Check for unclosed tags
        for tag in tag_stack:
            diagnostics.append({
                "line": len(lines),
                "column": 1,
                "message": f"Unclosed tag: {tag}",
                "severity": "error",
                "source": "html",
                "code": "unclosed-tag"
            })
        
        return {
            "diagnostics": diagnostics,
            "success": True,
            "linter_used": "html"
        }
    
    def lint_css(self, file_path: str, content: str, project_root: str) -> Dict[str, Any]:
        """Lint CSS code"""
        diagnostics = []
        
        # Basic CSS validation
        lines = content.split('\n')
        brace_count = 0
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Count braces
            brace_count += stripped.count('{') - stripped.count('}')
            
            # Check for common issues
            if stripped.endswith(';;'):
                diagnostics.append({
                    "line": i,
                    "column": len(line) - 1,
                    "message": "Unnecessary semicolon",
                    "severity": "warning",
                    "source": "css",
                    "code": "unnecessary-semicolon"
                })
        
        # Check for unmatched braces
        if brace_count != 0:
            diagnostics.append({
                "line": len(lines),
                "column": 1,
                "message": "Unmatched braces",
                "severity": "error",
                "source": "css",
                "code": "unmatched-braces"
            })
        
        return {
            "diagnostics": diagnostics,
            "success": True,
            "linter_used": "css"
        }

# Global linter instance
code_linter = CodeLinter()