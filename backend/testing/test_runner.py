"""
Advanced Test Runner for Python Projects
Supports pytest, unittest, doctest, and custom test discovery
"""

import os
import sys
import subprocess
import json
import time
from typing import Dict, List, Optional, Any
from pathlib import Path
import ast
import re


class TestResult:
    """Represents a single test result"""
    def __init__(self, name: str, status: str, duration: float, 
                 error: Optional[str] = None, output: Optional[str] = None):
        self.name = name
        self.status = status  # passed, failed, skipped, error
        self.duration = duration
        self.error = error
        self.output = output
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "duration": self.duration,
            "error": self.error,
            "output": self.output
        }


class TestSuite:
    """Represents a collection of tests"""
    def __init__(self, name: str):
        self.name = name
        self.tests: List[TestResult] = []
        self.total_duration = 0.0
    
    def add_test(self, test: TestResult):
        self.tests.append(test)
        self.total_duration += test.duration
    
    @property
    def passed(self) -> int:
        return sum(1 for t in self.tests if t.status == "passed")
    
    @property
    def failed(self) -> int:
        return sum(1 for t in self.tests if t.status == "failed")
    
    @property
    def skipped(self) -> int:
        return sum(1 for t in self.tests if t.status == "skipped")
    
    @property
    def errors(self) -> int:
        return sum(1 for t in self.tests if t.status == "error")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "total": len(self.tests),
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "errors": self.errors,
            "duration": self.total_duration,
            "tests": [t.to_dict() for t in self.tests]
        }


class TestRunner:
    """Advanced test runner with multiple framework support"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.test_frameworks = self._detect_frameworks()
    
    def _detect_frameworks(self) -> List[str]:
        """Detect which test frameworks are available"""
        frameworks = []
        
        # Check for pytest
        try:
            subprocess.run(["pytest", "--version"], capture_output=True, check=True)
            frameworks.append("pytest")
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        # unittest is built-in
        frameworks.append("unittest")
        
        # doctest is built-in
        frameworks.append("doctest")
        
        return frameworks
    
    def discover_tests(self) -> Dict[str, List[str]]:
        """Discover all test files in the project"""
        test_files = {
            "pytest": [],
            "unittest": [],
            "doctest": []
        }
        
        for root, dirs, files in os.walk(self.project_path):
            # Skip common non-test directories
            dirs[:] = [d for d in dirs if d not in ['.git', '.venv', 'venv', 'node_modules', '__pycache__']]
            
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    
                    # Check if it's a test file
                    if file.startswith('test_') or file.endswith('_test.py'):
                        test_files["pytest"].append(file_path)
                        test_files["unittest"].append(file_path)
                    
                    # Check for doctest
                    if self._has_doctest(file_path):
                        test_files["doctest"].append(file_path)
        
        return test_files
    
    def _has_doctest(self, file_path: str) -> bool:
        """Check if a file contains doctest examples"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Look for doctest patterns
                return '>>>' in content and ('"""' in content or "'''" in content)
        except Exception:
            return False
    
    def run_pytest(self, test_files: Optional[List[str]] = None, 
                   args: Optional[List[str]] = None) -> TestSuite:
        """Run tests using pytest"""
        suite = TestSuite("pytest")
        
        if "pytest" not in self.test_frameworks:
            return suite
        
        cmd = ["pytest", "--json-report", "--json-report-file=test_report.json", "-v"]
        
        if args:
            cmd.extend(args)
        
        if test_files:
            cmd.extend(test_files)
        else:
            cmd.append(str(self.project_path))
        
        try:
            start_time = time.time()
            result = subprocess.run(
                cmd,
                cwd=str(self.project_path),
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            duration = time.time() - start_time
            
            # Parse pytest output
            self._parse_pytest_output(result.stdout, result.stderr, suite)
            
        except subprocess.TimeoutExpired:
            suite.add_test(TestResult(
                "pytest_timeout",
                "error",
                300.0,
                error="Test execution timed out after 5 minutes"
            ))
        except Exception as e:
            suite.add_test(TestResult(
                "pytest_error",
                "error",
                0.0,
                error=str(e)
            ))
        
        return suite
    
    def _parse_pytest_output(self, stdout: str, stderr: str, suite: TestSuite):
        """Parse pytest output and populate test suite"""
        # Parse pytest verbose output
        test_pattern = re.compile(r'([\w/]+\.py)::([\w]+)::([\w]+)\s+(PASSED|FAILED|SKIPPED|ERROR)\s+\[[\d.]+s\]')
        
        for match in test_pattern.finditer(stdout):
            file_path, class_name, test_name, status = match.groups()
            full_name = f"{file_path}::{class_name}::{test_name}"
            
            suite.add_test(TestResult(
                full_name,
                status.lower(),
                0.0,  # Duration would need to be parsed separately
                error=None if status == "PASSED" else "See output for details"
            ))
        
        # If no tests found, check for summary
        if not suite.tests and "passed" in stdout.lower():
            summary_pattern = re.compile(r'(\d+) passed')
            match = summary_pattern.search(stdout)
            if match:
                count = int(match.group(1))
                for i in range(count):
                    suite.add_test(TestResult(f"test_{i}", "passed", 0.0))
    
    def run_unittest(self, test_files: Optional[List[str]] = None) -> TestSuite:
        """Run tests using unittest"""
        suite = TestSuite("unittest")
        
        cmd = [sys.executable, "-m", "unittest", "discover", "-v"]
        
        if test_files:
            # Run specific test files
            for test_file in test_files:
                self._run_unittest_file(test_file, suite)
        else:
            # Discover and run all tests
            try:
                start_time = time.time()
                result = subprocess.run(
                    cmd,
                    cwd=str(self.project_path),
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                duration = time.time() - start_time
                
                self._parse_unittest_output(result.stdout, result.stderr, suite)
                
            except Exception as e:
                suite.add_test(TestResult(
                    "unittest_error",
                    "error",
                    0.0,
                    error=str(e)
                ))
        
        return suite
    
    def _run_unittest_file(self, test_file: str, suite: TestSuite):
        """Run a specific unittest file"""
        try:
            # Convert file path to module path
            rel_path = os.path.relpath(test_file, self.project_path)
            module_path = rel_path.replace(os.sep, '.').replace('.py', '')
            
            cmd = [sys.executable, "-m", "unittest", module_path, "-v"]
            
            result = subprocess.run(
                cmd,
                cwd=str(self.project_path),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            self._parse_unittest_output(result.stdout, result.stderr, suite)
            
        except Exception as e:
            suite.add_test(TestResult(
                test_file,
                "error",
                0.0,
                error=str(e)
            ))
    
    def _parse_unittest_output(self, stdout: str, stderr: str, suite: TestSuite):
        """Parse unittest output"""
        # Parse unittest verbose output
        test_pattern = re.compile(r'(test_\w+)\s+\(([\w.]+)\)\s+\.\.\.\s+(ok|FAIL|ERROR|skipped)')
        
        for match in test_pattern.finditer(stderr):
            test_name, class_name, status = match.groups()
            full_name = f"{class_name}.{test_name}"
            
            status_map = {
                "ok": "passed",
                "FAIL": "failed",
                "ERROR": "error",
                "skipped": "skipped"
            }
            
            suite.add_test(TestResult(
                full_name,
                status_map.get(status, "error"),
                0.0
            ))
    
    def run_doctest(self, test_files: Optional[List[str]] = None) -> TestSuite:
        """Run doctest on files"""
        suite = TestSuite("doctest")
        
        if test_files:
            files_to_test = test_files
        else:
            discovered = self.discover_tests()
            files_to_test = discovered.get("doctest", [])
        
        for file_path in files_to_test:
            try:
                cmd = [sys.executable, "-m", "doctest", "-v", file_path]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                # Parse doctest output
                if "passed" in result.stdout or result.returncode == 0:
                    # Count tests
                    passed_pattern = re.compile(r'(\d+) tests? in \d+ items?')
                    match = passed_pattern.search(result.stdout)
                    if match:
                        count = int(match.group(1))
                        suite.add_test(TestResult(
                            file_path,
                            "passed",
                            0.0,
                            output=f"{count} doctests passed"
                        ))
                else:
                    suite.add_test(TestResult(
                        file_path,
                        "failed",
                        0.0,
                        error=result.stdout
                    ))
                    
            except Exception as e:
                suite.add_test(TestResult(
                    file_path,
                    "error",
                    0.0,
                    error=str(e)
                ))
        
        return suite
    
    def run_all_tests(self, framework: Optional[str] = None) -> Dict[str, TestSuite]:
        """Run all tests with specified framework or all available frameworks"""
        results = {}
        
        if framework:
            if framework == "pytest" and "pytest" in self.test_frameworks:
                results["pytest"] = self.run_pytest()
            elif framework == "unittest":
                results["unittest"] = self.run_unittest()
            elif framework == "doctest":
                results["doctest"] = self.run_doctest()
        else:
            # Run all available frameworks
            if "pytest" in self.test_frameworks:
                results["pytest"] = self.run_pytest()
            
            results["unittest"] = self.run_unittest()
            results["doctest"] = self.run_doctest()
        
        return results
    
    def generate_coverage_report(self, test_files: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate code coverage report using coverage.py"""
        try:
            # Check if coverage is installed
            subprocess.run(["coverage", "--version"], capture_output=True, check=True)
            
            # Run tests with coverage
            cmd = ["coverage", "run", "-m", "pytest"]
            if test_files:
                cmd.extend(test_files)
            
            subprocess.run(cmd, cwd=str(self.project_path), capture_output=True)
            
            # Generate report
            result = subprocess.run(
                ["coverage", "report", "--format=json"],
                cwd=str(self.project_path),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            pass
        
        return {"error": "Coverage report generation failed"}
    
    def get_test_statistics(self) -> Dict[str, Any]:
        """Get comprehensive test statistics"""
        discovered = self.discover_tests()
        
        return {
            "frameworks_available": self.test_frameworks,
            "test_files": {
                "pytest": len(discovered.get("pytest", [])),
                "unittest": len(discovered.get("unittest", [])),
                "doctest": len(discovered.get("doctest", []))
            },
            "total_test_files": len(set(
                discovered.get("pytest", []) + 
                discovered.get("unittest", []) + 
                discovered.get("doctest", [])
            ))
        }


def run_tests_for_project(project_path: str, framework: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entry point for running tests
    
    Args:
        project_path: Path to the project
        framework: Optional framework to use (pytest, unittest, doctest)
    
    Returns:
        Dictionary with test results
    """
    runner = TestRunner(project_path)
    results = runner.run_all_tests(framework)
    
    return {
        "statistics": runner.get_test_statistics(),
        "results": {name: suite.to_dict() for name, suite in results.items()},
        "summary": {
            "total_suites": len(results),
            "total_tests": sum(len(suite.tests) for suite in results.values()),
            "total_passed": sum(suite.passed for suite in results.values()),
            "total_failed": sum(suite.failed for suite in results.values()),
            "total_skipped": sum(suite.skipped for suite in results.values()),
            "total_errors": sum(suite.errors for suite in results.values()),
            "total_duration": sum(suite.total_duration for suite in results.values())
        }
    }