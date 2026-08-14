# backend/formatters.py
"""
Code formatters for different languages
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class CodeFormatter:
    """Handles code formatting for multiple languages"""

    def __init__(self):
        self.formatters = {
            "python": self.format_python,
            "javascript": self.format_javascript,
            "typescript": self.format_typescript,
            "json": self.format_json,
            "html": self.format_html,
            "css": self.format_css,
            "markdown": self.format_markdown,
        }

    def format_code(
        self, language: str, code: str, options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Format code for the specified language"""
        try:
            if language.lower() not in self.formatters:
                return {
                    "formatted": code,
                    "error": f"Formatter not available for {language}",
                    "success": False,
                }

            formatter = self.formatters[language.lower()]
            result = formatter(code, options or {})

            return {
                "formatted": result.get("formatted", code),
                "error": result.get("error"),
                "success": result.get("success", True),
                "formatter_used": result.get("formatter_used", language),
            }

        except Exception as e:
            logger.error(f"Formatting error for {language}: {e}")
            return {"formatted": code, "error": str(e), "success": False}

    def format_python(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format Python code using black"""
        try:
            # Try using black
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                # Run black
                result = subprocess.run(
                    [
                        "black",
                        "--quiet",
                        "--line-length",
                        str(options.get("line_length", 88)),
                        temp_file,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

                if result.returncode == 0:
                    with open(temp_file, "r") as f:
                        formatted_code = f.read()
                    return {
                        "formatted": formatted_code,
                        "success": True,
                        "formatter_used": "black",
                    }
                else:
                    # Fallback to basic formatting
                    return self.basic_python_format(code)

            finally:
                os.unlink(temp_file)

        except (subprocess.TimeoutExpired, FileNotFoundError):
            # Black not available, use basic formatting
            return self.basic_python_format(code)
        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def basic_python_format(self, code: str) -> Dict[str, Any]:
        """Basic Python formatting without external tools"""
        try:
            import ast
            import textwrap

            # Basic indentation fix
            lines = code.split("\n")
            formatted_lines = []
            indent_level = 0

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    formatted_lines.append("")
                    continue

                # Decrease indent for certain keywords
                if stripped.startswith(("except", "elif", "else", "finally")):
                    current_indent = max(0, indent_level - 1)
                elif stripped.startswith(
                    ("def ", "class ", "if ", "for ", "while ", "try:", "with ")
                ):
                    current_indent = indent_level
                else:
                    current_indent = indent_level

                formatted_lines.append("    " * current_indent + stripped)

                # Increase indent after certain keywords
                if stripped.endswith(":") and any(
                    stripped.startswith(kw)
                    for kw in [
                        "def ",
                        "class ",
                        "if ",
                        "for ",
                        "while ",
                        "try:",
                        "with ",
                        "except",
                        "elif",
                        "else",
                        "finally",
                    ]
                ):
                    indent_level = current_indent + 1

            return {
                "formatted": "\n".join(formatted_lines),
                "success": True,
                "formatter_used": "basic",
            }

        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_javascript(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format JavaScript code using prettier"""
        try:
            # Try using prettier
            with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                result = subprocess.run(
                    [
                        "npx",
                        "prettier",
                        "--write",
                        "--tab-width",
                        str(options.get("tab_width", 2)),
                        temp_file,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=15,
                )

                if result.returncode == 0:
                    with open(temp_file, "r") as f:
                        formatted_code = f.read()
                    return {
                        "formatted": formatted_code,
                        "success": True,
                        "formatter_used": "prettier",
                    }
                else:
                    return self.basic_js_format(code)

            finally:
                os.unlink(temp_file)

        except (subprocess.TimeoutExpired, FileNotFoundError):
            return self.basic_js_format(code)
        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_typescript(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format TypeScript code using prettier"""
        try:
            # Try using prettier
            with tempfile.NamedTemporaryFile(mode="w", suffix=".ts", delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                result = subprocess.run(
                    [
                        "npx",
                        "prettier",
                        "--write",
                        "--parser",
                        "typescript",
                        "--tab-width",
                        str(options.get("tab_width", 2)),
                        temp_file,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=15,
                )

                if result.returncode == 0:
                    with open(temp_file, "r") as f:
                        formatted_code = f.read()
                    return {
                        "formatted": formatted_code,
                        "success": True,
                        "formatter_used": "prettier",
                    }
                else:
                    return self.basic_js_format(code)

            finally:
                os.unlink(temp_file)

        except (subprocess.TimeoutExpired, FileNotFoundError):
            return self.basic_js_format(code)
        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def basic_js_format(self, code: str) -> Dict[str, Any]:
        """Basic JavaScript/TypeScript formatting"""
        try:
            lines = code.split("\n")
            formatted_lines = []
            indent_level = 0

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    formatted_lines.append("")
                    continue

                # Decrease indent for closing braces
                if stripped.startswith("}"):
                    indent_level = max(0, indent_level - 1)

                formatted_lines.append("  " * indent_level + stripped)

                # Increase indent after opening braces
                if stripped.endswith("{"):
                    indent_level += 1

            return {
                "formatted": "\n".join(formatted_lines),
                "success": True,
                "formatter_used": "basic",
            }

        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_json(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format JSON code"""
        try:
            import json

            parsed = json.loads(code)
            formatted = json.dumps(
                parsed,
                indent=options.get("indent", 2),
                sort_keys=options.get("sort_keys", False),
            )
            return {"formatted": formatted, "success": True, "formatter_used": "json"}
        except json.JSONDecodeError as e:
            return {
                "formatted": code,
                "error": f"Invalid JSON: {str(e)}",
                "success": False,
            }
        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_html(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format HTML code"""
        try:
            # Basic HTML formatting
            lines = code.split("\n")
            formatted_lines = []
            indent_level = 0

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    formatted_lines.append("")
                    continue

                # Decrease indent for closing tags
                if stripped.startswith("</"):
                    indent_level = max(0, indent_level - 1)

                formatted_lines.append("  " * indent_level + stripped)

                # Increase indent after opening tags (but not self-closing)
                if (
                    "<" in stripped
                    and ">" in stripped
                    and not stripped.startswith("</")
                    and not stripped.endswith("/>")
                ):
                    indent_level += 1

            return {
                "formatted": "\n".join(formatted_lines),
                "success": True,
                "formatter_used": "basic",
            }

        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_css(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format CSS code"""
        try:
            # Basic CSS formatting
            lines = code.split("\n")
            formatted_lines = []
            indent_level = 0

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    formatted_lines.append("")
                    continue

                if stripped == "}":
                    indent_level = max(0, indent_level - 1)

                formatted_lines.append("  " * indent_level + stripped)

                if stripped.endswith("{"):
                    indent_level += 1

            return {
                "formatted": "\n".join(formatted_lines),
                "success": True,
                "formatter_used": "basic",
            }

        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}

    def format_markdown(self, code: str, options: Dict) -> Dict[str, Any]:
        """Format Markdown code"""
        try:
            # Basic markdown formatting - mostly just clean up spacing
            lines = code.split("\n")
            formatted_lines = []

            for i, line in enumerate(lines):
                stripped = line.strip()

                # Add spacing around headers
                if stripped.startswith("#"):
                    if i > 0 and formatted_lines and formatted_lines[-1].strip():
                        formatted_lines.append("")
                    formatted_lines.append(stripped)
                    if i < len(lines) - 1:
                        formatted_lines.append("")
                else:
                    formatted_lines.append(line)

            return {
                "formatted": "\n".join(formatted_lines),
                "success": True,
                "formatter_used": "basic",
            }

        except Exception as e:
            return {"formatted": code, "error": str(e), "success": False}


# Global formatter instance
code_formatter = CodeFormatter()
