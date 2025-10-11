"""
Quick test script for MCP Debugging System
Run this to verify MCP is working correctly
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all MCP modules can be imported"""
    print("🔍 Testing MCP imports...")
    
    try:
        from backend.mcp.main import MCPService
        from backend.mcp.scanner import CodeScanner
        from backend.mcp.llm_fixer import LLMFixer
        from backend.mcp.patch_executor import PatchExecutor
        from backend.mcp.explainer import IssueExplainer
        from backend.mcp.config import MCPConfig
        from backend.mcp.models import ScanRequest, FixRequest, CodeIssue
        from backend.mcp.analyzers.python_analyzer import PythonAnalyzer
        from backend.mcp.analyzers.js_analyzer import JSAnalyzer
        from backend.mcp.analyzers.generic_analyzer import GenericAnalyzer
        
        print("✅ All MCP modules imported successfully!")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_analyzers():
    """Test analyzer availability"""
    print("\n🔍 Testing analyzers...")
    
    import subprocess
    
    analyzers = {
        "flake8": ["flake8", "--version"],
        "mypy": ["mypy", "--version"],
        "bandit": ["bandit", "--version"],
        "pylint": ["pylint", "--version"],
    }
    
    results = {}
    for name, cmd in analyzers.items():
        try:
            subprocess.run(cmd, capture_output=True, timeout=5, check=True)
            results[name] = True
            print(f"  ✅ {name} available")
        except:
            results[name] = False
            print(f"  ❌ {name} not available")
    
    return results

def test_scanner():
    """Test code scanner"""
    print("\n🔍 Testing code scanner...")
    
    try:
        from backend.mcp.scanner import CodeScanner
        from backend.mcp.models import ScanRequest
        
        scanner = CodeScanner()
        print("  ✅ Scanner initialized")
        
        # Create a test file
        test_dir = os.path.join(os.path.dirname(__file__), "test_project")
        os.makedirs(test_dir, exist_ok=True)
        
        test_file = os.path.join(test_dir, "test.py")
        with open(test_file, "w") as f:
            f.write("""
# Test file with intentional issues
def bad_function( ):
    x=1+2  # No spaces
    unused_var = 5
    return x
""")
        
        print(f"  ✅ Created test file: {test_file}")
        
        # Scan the test project
        result = scanner.scan_project(test_dir)
        
        print(f"  ✅ Scan completed!")
        print(f"     Files scanned: {result.scanned_files}")
        print(f"     Issues found: {result.total_issues}")
        
        # Cleanup
        os.remove(test_file)
        os.rmdir(test_dir)
        
        return True
        
    except Exception as e:
        print(f"  ❌ Scanner test failed: {e}")
        return False

def test_config():
    """Test MCP configuration"""
    print("\n🔍 Testing MCP configuration...")
    
    try:
        from backend.mcp.config import MCPConfig
        
        # Test language detection
        assert MCPConfig.get_language("test.py") == "python"
        assert MCPConfig.get_language("test.js") == "javascript"
        assert MCPConfig.get_language("test.ts") == "typescript"
        print("  ✅ Language detection works")
        
        # Test analyzer mapping
        analyzers = MCPConfig.get_analyzers("python")
        assert "flake8" in analyzers
        print("  ✅ Analyzer mapping works")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Config test failed: {e}")
        return False

def test_models():
    """Test data models"""
    print("\n🔍 Testing data models...")
    
    try:
        from backend.mcp.models import (
            CodeIssue, IssueSeverity, IssueCategory,
            ScanRequest, ScanResult, FixRequest
        )
        
        # Create a test issue
        issue = CodeIssue(
            file_path="test.py",
            line_number=10,
            severity=IssueSeverity.ERROR,
            category=IssueCategory.SYNTAX,
            message="Test issue",
            analyzer="test"
        )
        
        print("  ✅ CodeIssue model works")
        
        # Create scan request
        request = ScanRequest(project_path="/test")
        print("  ✅ ScanRequest model works")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Models test failed: {e}")
        return False

def test_ai_clients():
    """Test AI client imports"""
    print("\n🔍 Testing AI client imports...")
    
    clients = {
        "LangChain": "backend.langchain_client",
        "Tabby": "backend.tabby_client",
        "LM Studio": "backend.lmstudio_client",
        "Transformers": "backend.transformers_client",
    }
    
    results = {}
    for name, module in clients.items():
        try:
            __import__(module)
            results[name] = True
            print(f"  ✅ {name} client available")
        except ImportError as e:
            results[name] = False
            print(f"  ⚠️  {name} client not available (optional): {e}")
    
    return results

def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Vybe MCP Debugging System - Test Suite")
    print("=" * 60)
    
    results = {
        "imports": test_imports(),
        "analyzers": test_analyzers(),
        "config": test_config(),
        "models": test_models(),
        "scanner": test_scanner(),
        "ai_clients": test_ai_clients(),
    }
    
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v is True or isinstance(v, dict))
    total = len(results)
    
    for test, result in results.items():
        if isinstance(result, dict):
            status = "✅ PARTIAL" if any(result.values()) else "❌ FAILED"
        else:
            status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test.upper()}: {status}")
    
    print("=" * 60)
    print(f"Overall: {passed}/{total} test groups passed")
    
    if passed == total:
        print("\n🎉 All tests passed! MCP is ready to use!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
        print("💡 Tip: Install missing analyzers with:")
        print("   pip install flake8 mypy bandit pylint")
        return 1

if __name__ == "__main__":
    sys.exit(main())