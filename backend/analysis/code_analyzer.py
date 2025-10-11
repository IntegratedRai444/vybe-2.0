"""
Advanced Python Code Analyzer
Provides deep code analysis including complexity, dependencies, and quality metrics
"""

import ast
import os
import re
from typing import Dict, List, Any, Optional, Set
from pathlib import Path
from collections import defaultdict
import json


class CodeMetrics:
    """Container for code metrics"""
    def __init__(self):
        self.lines_of_code = 0
        self.comment_lines = 0
        self.blank_lines = 0
        self.functions = 0
        self.classes = 0
        self.imports = 0
        self.complexity = 0
        self.maintainability_index = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "lines_of_code": self.lines_of_code,
            "comment_lines": self.comment_lines,
            "blank_lines": self.blank_lines,
            "functions": self.functions,
            "classes": self.classes,
            "imports": self.imports,
            "cyclomatic_complexity": self.complexity,
            "maintainability_index": self.maintainability_index
        }


class FunctionAnalysis:
    """Analysis of a single function"""
    def __init__(self, name: str, lineno: int):
        self.name = name
        self.lineno = lineno
        self.complexity = 0
        self.parameters = []
        self.returns = False
        self.docstring = None
        self.lines = 0
        self.calls: List[str] = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "line": self.lineno,
            "complexity": self.complexity,
            "parameters": self.parameters,
            "has_return": self.returns,
            "has_docstring": self.docstring is not None,
            "lines": self.lines,
            "calls": self.calls
        }


class ClassAnalysis:
    """Analysis of a single class"""
    def __init__(self, name: str, lineno: int):
        self.name = name
        self.lineno = lineno
        self.methods: List[FunctionAnalysis] = []
        self.bases: List[str] = []
        self.docstring = None
        self.lines = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "line": self.lineno,
            "methods": [m.to_dict() for m in self.methods],
            "bases": self.bases,
            "has_docstring": self.docstring is not None,
            "lines": self.lines,
            "method_count": len(self.methods)
        }


class CodeAnalyzer:
    """Advanced code analyzer for Python projects"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.files_analyzed = 0
        self.total_metrics = CodeMetrics()
    
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze a single Python file"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {"error": f"File not found: {file_path}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content, filename=str(file_path))
            
            # Analyze
            metrics = self._calculate_metrics(content, tree)
            functions = self._analyze_functions(tree)
            classes = self._analyze_classes(tree)
            imports = self._analyze_imports(tree)
            dependencies = self._analyze_dependencies(tree)
            
            return {
                "file": str(file_path),
                "metrics": metrics.to_dict(),
                "functions": [f.to_dict() for f in functions],
                "classes": [c.to_dict() for c in classes],
                "imports": imports,
                "dependencies": dependencies,
                "complexity_rating": self._rate_complexity(metrics.complexity),
                "maintainability_rating": self._rate_maintainability(metrics.maintainability_index)
            }
            
        except SyntaxError as e:
            return {
                "file": str(file_path),
                "error": f"Syntax error: {e}",
                "line": e.lineno
            }
        except Exception as e:
            return {
                "file": str(file_path),
                "error": str(e)
            }
    
    def _calculate_metrics(self, content: str, tree: ast.AST) -> CodeMetrics:
        """Calculate code metrics"""
        metrics = CodeMetrics()
        
        lines = content.split('\n')
        metrics.lines_of_code = len(lines)
        
        # Count comment and blank lines
        for line in lines:
            stripped = line.strip()
            if not stripped:
                metrics.blank_lines += 1
            elif stripped.startswith('#'):
                metrics.comment_lines += 1
        
        # Count functions, classes, imports
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                metrics.functions += 1
            elif isinstance(node, ast.ClassDef):
                metrics.classes += 1
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                metrics.imports += 1
        
        # Calculate cyclomatic complexity
        metrics.complexity = self._calculate_complexity(tree)
        
        # Calculate maintainability index
        metrics.maintainability_index = self._calculate_maintainability(metrics)
        
        return metrics
    
    def _calculate_complexity(self, tree: ast.AST) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1  # Base complexity
        
        for node in ast.walk(tree):
            # Decision points increase complexity
            if isinstance(node, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
            elif isinstance(node, (ast.And, ast.Or)):
                complexity += 1
        
        return complexity
    
    def _calculate_maintainability(self, metrics: CodeMetrics) -> float:
        """
        Calculate maintainability index (0-100)
        Based on Microsoft's maintainability index formula
        """
        loc = max(metrics.lines_of_code - metrics.blank_lines - metrics.comment_lines, 1)
        complexity = max(metrics.complexity, 1)
        
        # Simplified maintainability index
        mi = 171 - 5.2 * (complexity ** 0.23) - 0.23 * loc - 16.2 * (loc / max(metrics.functions, 1))
        
        # Normalize to 0-100
        mi = max(0, min(100, mi))
        
        return round(mi, 2)
    
    def _analyze_functions(self, tree: ast.AST) -> List[FunctionAnalysis]:
        """Analyze all functions in the AST"""
        functions = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func = FunctionAnalysis(node.name, node.lineno)
                
                # Get parameters
                func.parameters = [arg.arg for arg in node.args.args]
                
                # Check for return statement
                for child in ast.walk(node):
                    if isinstance(child, ast.Return):
                        func.returns = True
                        break
                
                # Get docstring
                func.docstring = ast.get_docstring(node)
                
                # Calculate lines
                if hasattr(node, 'end_lineno'):
                    func.lines = node.end_lineno - node.lineno + 1
                
                # Calculate complexity
                func.complexity = self._calculate_function_complexity(node)
                
                # Find function calls
                func.calls = self._find_function_calls(node)
                
                functions.append(func)
        
        return functions
    
    def _calculate_function_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate complexity for a single function"""
        complexity = 1
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _find_function_calls(self, node: ast.FunctionDef) -> List[str]:
        """Find all function calls within a function"""
        calls = []
        
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.append(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.append(child.func.attr)
        
        return list(set(calls))  # Remove duplicates
    
    def _analyze_classes(self, tree: ast.AST) -> List[ClassAnalysis]:
        """Analyze all classes in the AST"""
        classes = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                cls = ClassAnalysis(node.name, node.lineno)
                
                # Get base classes
                cls.bases = [self._get_name(base) for base in node.bases]
                
                # Get docstring
                cls.docstring = ast.get_docstring(node)
                
                # Calculate lines
                if hasattr(node, 'end_lineno'):
                    cls.lines = node.end_lineno - node.lineno + 1
                
                # Analyze methods
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        method = FunctionAnalysis(item.name, item.lineno)
                        method.parameters = [arg.arg for arg in item.args.args]
                        method.docstring = ast.get_docstring(item)
                        method.complexity = self._calculate_function_complexity(item)
                        cls.methods.append(method)
                
                classes.append(cls)
        
        return classes
    
    def _get_name(self, node: ast.AST) -> str:
        """Get name from AST node"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_name(node.value)}.{node.attr}"
        return str(node)
    
    def _analyze_imports(self, tree: ast.AST) -> Dict[str, List[str]]:
        """Analyze imports in the file"""
        imports = {
            "standard_library": [],
            "third_party": [],
            "local": []
        }
        
        stdlib_modules = self._get_stdlib_modules()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module = alias.name.split('.')[0]
                    self._categorize_import(module, imports, stdlib_modules)
            
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    module = node.module.split('.')[0]
                    self._categorize_import(module, imports, stdlib_modules)
        
        return imports
    
    def _get_stdlib_modules(self) -> Set[str]:
        """Get set of standard library module names"""
        # Common standard library modules
        return {
            'abc', 'argparse', 'ast', 'asyncio', 'base64', 'collections',
            'copy', 'csv', 'datetime', 'decimal', 'email', 'enum', 'functools',
            'glob', 'hashlib', 'http', 'io', 'itertools', 'json', 'logging',
            'math', 'os', 'pathlib', 'pickle', 're', 'shutil', 'socket',
            'sqlite3', 'string', 'subprocess', 'sys', 'tempfile', 'threading',
            'time', 'typing', 'unittest', 'urllib', 'uuid', 'warnings', 'xml'
        }
    
    def _categorize_import(self, module: str, imports: Dict, stdlib: Set[str]):
        """Categorize an import as stdlib, third-party, or local"""
        if module in stdlib:
            if module not in imports["standard_library"]:
                imports["standard_library"].append(module)
        elif module.startswith('.'):
            if module not in imports["local"]:
                imports["local"].append(module)
        else:
            if module not in imports["third_party"]:
                imports["third_party"].append(module)
    
    def _analyze_dependencies(self, tree: ast.AST) -> List[str]:
        """Extract all dependencies from imports"""
        dependencies = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dependencies.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    dependencies.add(node.module.split('.')[0])
        
        return sorted(list(dependencies))
    
    def _rate_complexity(self, complexity: int) -> str:
        """Rate complexity level"""
        if complexity <= 10:
            return "Low"
        elif complexity <= 20:
            return "Medium"
        elif complexity <= 50:
            return "High"
        else:
            return "Very High"
    
    def _rate_maintainability(self, mi: float) -> str:
        """Rate maintainability"""
        if mi >= 80:
            return "Excellent"
        elif mi >= 60:
            return "Good"
        elif mi >= 40:
            return "Fair"
        elif mi >= 20:
            return "Poor"
        else:
            return "Critical"
    
    def analyze_project(self) -> Dict[str, Any]:
        """Analyze entire project"""
        results = []
        total_metrics = CodeMetrics()
        
        # Find all Python files
        python_files = []
        for root, dirs, files in os.walk(self.project_path):
            # Skip common non-source directories
            dirs[:] = [d for d in dirs if d not in ['.git', '.venv', 'venv', 'node_modules', '__pycache__', '.pytest_cache']]
            
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        # Analyze each file
        for file_path in python_files:
            result = self.analyze_file(file_path)
            results.append(result)
            
            # Aggregate metrics
            if "metrics" in result:
                m = result["metrics"]
                total_metrics.lines_of_code += m["lines_of_code"]
                total_metrics.comment_lines += m["comment_lines"]
                total_metrics.blank_lines += m["blank_lines"]
                total_metrics.functions += m["functions"]
                total_metrics.classes += m["classes"]
                total_metrics.imports += m["imports"]
                total_metrics.complexity += m["cyclomatic_complexity"]
        
        # Calculate average maintainability
        if results:
            valid_mi = [r["metrics"]["maintainability_index"] for r in results if "metrics" in r]
            total_metrics.maintainability_index = sum(valid_mi) / len(valid_mi) if valid_mi else 0
        
        return {
            "project": str(self.project_path),
            "total_files": len(python_files),
            "files_analyzed": len(results),
            "total_metrics": total_metrics.to_dict(),
            "files": results,
            "summary": {
                "complexity_rating": self._rate_complexity(total_metrics.complexity),
                "maintainability_rating": self._rate_maintainability(total_metrics.maintainability_index),
                "average_complexity_per_file": round(total_metrics.complexity / max(len(results), 1), 2),
                "code_to_comment_ratio": round(
                    total_metrics.lines_of_code / max(total_metrics.comment_lines, 1), 2
                )
            }
        }
    
    def find_code_smells(self, file_path: str) -> List[Dict[str, Any]]:
        """Detect common code smells"""
        smells = []
        
        analysis = self.analyze_file(file_path)
        
        if "error" in analysis:
            return smells
        
        # Long functions
        for func in analysis.get("functions", []):
            if func["lines"] > 50:
                smells.append({
                    "type": "long_function",
                    "severity": "warning",
                    "line": func["line"],
                    "message": f"Function '{func['name']}' is too long ({func['lines']} lines)",
                    "suggestion": "Consider breaking it into smaller functions"
                })
            
            # High complexity
            if func["complexity"] > 10:
                smells.append({
                    "type": "high_complexity",
                    "severity": "warning",
                    "line": func["line"],
                    "message": f"Function '{func['name']}' has high complexity ({func['complexity']})",
                    "suggestion": "Simplify the function logic"
                })
            
            # Missing docstring
            if not func["has_docstring"]:
                smells.append({
                    "type": "missing_docstring",
                    "severity": "info",
                    "line": func["line"],
                    "message": f"Function '{func['name']}' lacks documentation",
                    "suggestion": "Add a docstring explaining the function's purpose"
                })
        
        # Large classes
        for cls in analysis.get("classes", []):
            if cls["method_count"] > 20:
                smells.append({
                    "type": "large_class",
                    "severity": "warning",
                    "line": cls["line"],
                    "message": f"Class '{cls['name']}' has too many methods ({cls['method_count']})",
                    "suggestion": "Consider splitting into multiple classes"
                })
        
        return smells
    
    def export_analysis(self, output_path: Optional[str] = None) -> str:
        """Export analysis results to JSON"""
        if output_path is None:
            output_path = self.project_path / "code_analysis.json"
        
        analysis = self.analyze_project()
        
        with open(output_path, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        return str(output_path)