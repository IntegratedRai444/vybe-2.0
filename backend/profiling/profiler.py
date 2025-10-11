"""
Advanced Python Code Profiler
Supports cProfile, line_profiler, memory_profiler, and performance analysis
"""

import cProfile
import pstats
import io
import time
import tracemalloc
import sys
import os
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path
import json
import subprocess
from functools import wraps


class ProfileResult:
    """Container for profiling results"""
    def __init__(self, profile_type: str):
        self.profile_type = profile_type
        self.data: Dict[str, Any] = {}
        self.timestamp = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.profile_type,
            "timestamp": self.timestamp,
            "data": self.data
        }


class CodeProfiler:
    """Advanced code profiler with multiple profiling strategies"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.results: List[ProfileResult] = []
    
    def profile_function(self, func: Callable, *args, **kwargs) -> ProfileResult:
        """Profile a single function using cProfile"""
        result = ProfileResult("function")
        
        profiler = cProfile.Profile()
        profiler.enable()
        
        start_time = time.time()
        return_value = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        profiler.disable()
        
        # Capture stats
        s = io.StringIO()
        ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
        ps.print_stats(20)  # Top 20 functions
        
        result.data = {
            "function_name": func.__name__,
            "execution_time": execution_time,
            "stats": s.getvalue(),
            "return_value": str(return_value)[:100]  # Truncate large returns
        }
        
        self.results.append(result)
        return result
    
    def profile_script(self, script_path: str, args: Optional[List[str]] = None) -> ProfileResult:
        """Profile an entire Python script"""
        result = ProfileResult("script")
        
        script_path = Path(script_path)
        if not script_path.exists():
            result.data = {"error": f"Script not found: {script_path}"}
            return result
        
        # Run script with cProfile
        cmd = [sys.executable, "-m", "cProfile", "-o", "profile.stats", str(script_path)]
        if args:
            cmd.extend(args)
        
        try:
            start_time = time.time()
            proc_result = subprocess.run(
                cmd,
                cwd=str(self.project_path),
                capture_output=True,
                text=True,
                timeout=60
            )
            execution_time = time.time() - start_time
            
            # Load and parse stats
            stats_file = self.project_path / "profile.stats"
            if stats_file.exists():
                s = io.StringIO()
                ps = pstats.Stats(str(stats_file), stream=s)
                ps.sort_stats('cumulative')
                ps.print_stats(30)
                
                result.data = {
                    "script": str(script_path),
                    "execution_time": execution_time,
                    "stats": s.getvalue(),
                    "stdout": proc_result.stdout[:1000],
                    "stderr": proc_result.stderr[:1000]
                }
                
                # Clean up
                stats_file.unlink()
            else:
                result.data = {
                    "error": "Profile stats file not generated",
                    "stdout": proc_result.stdout,
                    "stderr": proc_result.stderr
                }
                
        except subprocess.TimeoutExpired:
            result.data = {"error": "Script execution timed out"}
        except Exception as e:
            result.data = {"error": str(e)}
        
        self.results.append(result)
        return result
    
    def profile_memory(self, func: Callable, *args, **kwargs) -> ProfileResult:
        """Profile memory usage of a function"""
        result = ProfileResult("memory")
        
        tracemalloc.start()
        
        start_time = time.time()
        snapshot_before = tracemalloc.take_snapshot()
        
        return_value = func(*args, **kwargs)
        
        snapshot_after = tracemalloc.take_snapshot()
        execution_time = time.time() - start_time
        
        # Get memory statistics
        top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
        
        memory_data = []
        for stat in top_stats[:10]:  # Top 10 memory allocations
            memory_data.append({
                "file": stat.traceback.format()[0] if stat.traceback else "unknown",
                "size_diff": stat.size_diff,
                "size": stat.size,
                "count": stat.count
            })
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        result.data = {
            "function_name": func.__name__,
            "execution_time": execution_time,
            "current_memory": current,
            "peak_memory": peak,
            "top_allocations": memory_data
        }
        
        self.results.append(result)
        return result
    
    def profile_line_by_line(self, script_path: str) -> ProfileResult:
        """Profile script line by line (requires line_profiler)"""
        result = ProfileResult("line_by_line")
        
        try:
            # Check if line_profiler is installed
            subprocess.run(
                ["kernprof", "--version"],
                capture_output=True,
                check=True
            )
            
            # Run line profiler
            cmd = ["kernprof", "-l", "-v", str(script_path)]
            
            proc_result = subprocess.run(
                cmd,
                cwd=str(self.project_path),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            result.data = {
                "script": str(script_path),
                "output": proc_result.stdout,
                "available": True
            }
            
        except (subprocess.CalledProcessError, FileNotFoundError):
            result.data = {
                "error": "line_profiler not installed",
                "available": False,
                "install_command": "pip install line_profiler"
            }
        except subprocess.TimeoutExpired:
            result.data = {"error": "Profiling timed out"}
        except Exception as e:
            result.data = {"error": str(e)}
        
        self.results.append(result)
        return result
    
    def analyze_hotspots(self, script_path: str) -> ProfileResult:
        """Identify performance hotspots in code"""
        result = ProfileResult("hotspots")
        
        # Profile the script
        profile_result = self.profile_script(script_path)
        
        if "stats" in profile_result.data:
            stats_text = profile_result.data["stats"]
            
            # Parse stats to find hotspots
            hotspots = []
            lines = stats_text.split('\n')
            
            for line in lines:
                if line.strip() and not line.startswith('ncalls'):
                    parts = line.split()
                    if len(parts) >= 6:
                        try:
                            cumtime = float(parts[3])
                            if cumtime > 0.01:  # More than 10ms
                                hotspots.append({
                                    "function": parts[-1],
                                    "cumulative_time": cumtime,
                                    "calls": parts[0]
                                })
                        except (ValueError, IndexError):
                            continue
            
            # Sort by cumulative time
            hotspots.sort(key=lambda x: x["cumulative_time"], reverse=True)
            
            result.data = {
                "script": str(script_path),
                "hotspots": hotspots[:10],  # Top 10 hotspots
                "total_hotspots": len(hotspots)
            }
        else:
            result.data = {"error": "Could not analyze hotspots"}
        
        self.results.append(result)
        return result
    
    def benchmark_function(self, func: Callable, iterations: int = 100, 
                          *args, **kwargs) -> ProfileResult:
        """Benchmark a function over multiple iterations"""
        result = ProfileResult("benchmark")
        
        times = []
        
        for _ in range(iterations):
            start = time.perf_counter()
            func(*args, **kwargs)
            end = time.perf_counter()
            times.append(end - start)
        
        # Calculate statistics
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        # Calculate standard deviation
        variance = sum((t - avg_time) ** 2 for t in times) / len(times)
        std_dev = variance ** 0.5
        
        result.data = {
            "function_name": func.__name__,
            "iterations": iterations,
            "average_time": avg_time,
            "min_time": min_time,
            "max_time": max_time,
            "std_deviation": std_dev,
            "total_time": sum(times)
        }
        
        self.results.append(result)
        return result
    
    def compare_implementations(self, funcs: List[Callable], 
                               iterations: int = 100,
                               *args, **kwargs) -> ProfileResult:
        """Compare performance of multiple function implementations"""
        result = ProfileResult("comparison")
        
        comparisons = []
        
        for func in funcs:
            benchmark = self.benchmark_function(func, iterations, *args, **kwargs)
            comparisons.append({
                "function": func.__name__,
                "average_time": benchmark.data["average_time"],
                "min_time": benchmark.data["min_time"],
                "max_time": benchmark.data["max_time"]
            })
        
        # Sort by average time
        comparisons.sort(key=lambda x: x["average_time"])
        
        # Calculate relative performance
        if comparisons:
            fastest = comparisons[0]["average_time"]
            for comp in comparisons:
                comp["relative_speed"] = comp["average_time"] / fastest
        
        result.data = {
            "iterations": iterations,
            "comparisons": comparisons,
            "fastest": comparisons[0]["function"] if comparisons else None
        }
        
        self.results.append(result)
        return result
    
    def export_results(self, output_path: Optional[str] = None) -> str:
        """Export all profiling results to JSON"""
        if output_path is None:
            output_path = self.project_path / "profile_results.json"
        
        data = {
            "project": str(self.project_path),
            "timestamp": time.time(),
            "results": [r.to_dict() for r in self.results]
        }
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return str(output_path)
    
    def generate_report(self) -> str:
        """Generate a human-readable profiling report"""
        report = ["=" * 80]
        report.append("PROFILING REPORT")
        report.append("=" * 80)
        report.append(f"Project: {self.project_path}")
        report.append(f"Total Profiles: {len(self.results)}")
        report.append("")
        
        for i, result in enumerate(self.results, 1):
            report.append(f"\n{i}. {result.profile_type.upper()} PROFILE")
            report.append("-" * 80)
            
            if result.profile_type == "function":
                report.append(f"Function: {result.data.get('function_name')}")
                report.append(f"Execution Time: {result.data.get('execution_time', 0):.4f}s")
            
            elif result.profile_type == "memory":
                report.append(f"Function: {result.data.get('function_name')}")
                report.append(f"Peak Memory: {result.data.get('peak_memory', 0) / 1024 / 1024:.2f} MB")
                report.append(f"Current Memory: {result.data.get('current_memory', 0) / 1024 / 1024:.2f} MB")
            
            elif result.profile_type == "benchmark":
                report.append(f"Function: {result.data.get('function_name')}")
                report.append(f"Iterations: {result.data.get('iterations')}")
                report.append(f"Average Time: {result.data.get('average_time', 0) * 1000:.4f}ms")
                report.append(f"Min Time: {result.data.get('min_time', 0) * 1000:.4f}ms")
                report.append(f"Max Time: {result.data.get('max_time', 0) * 1000:.4f}ms")
            
            elif result.profile_type == "comparison":
                report.append("Performance Comparison:")
                for comp in result.data.get('comparisons', []):
                    report.append(f"  {comp['function']}: {comp['average_time'] * 1000:.4f}ms "
                                f"({comp.get('relative_speed', 1):.2f}x)")
            
            elif result.profile_type == "hotspots":
                report.append(f"Script: {result.data.get('script')}")
                report.append("Top Hotspots:")
                for hotspot in result.data.get('hotspots', [])[:5]:
                    report.append(f"  {hotspot['function']}: {hotspot['cumulative_time']:.4f}s")
        
        report.append("\n" + "=" * 80)
        return "\n".join(report)


# Decorator for easy profiling
def profile(profile_type: str = "function"):
    """Decorator to profile a function"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            profiler = CodeProfiler(".")
            
            if profile_type == "memory":
                result = profiler.profile_memory(func, *args, **kwargs)
            else:
                result = profiler.profile_function(func, *args, **kwargs)
            
            print(f"\n[PROFILE] {func.__name__}")
            print(f"Execution Time: {result.data.get('execution_time', 0):.4f}s")
            
            if profile_type == "memory":
                print(f"Peak Memory: {result.data.get('peak_memory', 0) / 1024 / 1024:.2f} MB")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator