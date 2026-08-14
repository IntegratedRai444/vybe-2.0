#!/usr/bin/env python3
"""
Install Language Servers for LSP Integration
"""

import os
import subprocess
import sys
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(
            command, shell=True, check=True, capture_output=True, text=True
        )
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(f"   Output: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"   Error: {e.stderr.strip() if e.stderr else str(e)}")
        return False


def check_command_exists(command):
    """Check if a command exists"""
    try:
        subprocess.run(
            f"where {command}" if os.name == "nt" else f"which {command}",
            shell=True,
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def install_python_lsp():
    """Install Python Language Server"""
    print("\n📦 Installing Python Language Server...")

    # Try different Python LSP servers
    servers = [
        ("python-lsp-server[all]", "Python LSP Server (pylsp) with all plugins"),
        ("jedi-language-server", "Jedi Language Server (alternative)"),
    ]

    for package, description in servers:
        if run_command(f"pip install {package}", f"Installing {description}"):
            return True

    return False


def install_typescript_lsp():
    """Install TypeScript Language Server"""
    print("\n📦 Installing TypeScript Language Server...")

    # Check if npm is available
    if not check_command_exists("npm"):
        print("❌ npm not found. Please install Node.js first.")
        return False

    # Install TypeScript Language Server globally
    return run_command(
        "npm install -g typescript-language-server typescript",
        "Installing TypeScript Language Server",
    )


def test_language_servers():
    """Test if language servers are working"""
    print("\n🧪 Testing Language Servers...")

    # Test Python LSP
    if check_command_exists("pylsp"):
        print("✅ Python LSP Server (pylsp) is available")
    elif check_command_exists("jedi-language-server"):
        print("✅ Jedi Language Server is available")
    else:
        print("❌ No Python language server found")

    # Test TypeScript LSP
    if check_command_exists("typescript-language-server"):
        print("✅ TypeScript Language Server is available")
    else:
        print("❌ TypeScript Language Server not found")


def create_lsp_test_script():
    """Create a test script for LSP functionality"""
    test_script = """#!/usr/bin/env python3
\"\"\"
Test LSP functionality
\"\"\"

import requests
import json

def test_lsp_server():
    print("🧪 Testing LSP Integration...")

    # Test Python LSP
    try:
        response = requests.post("http://127.0.0.1:8000/lsp/start",
                               json={"language": "python", "root_path": "."})
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ Python LSP server started successfully")
            else:
                print("❌ Python LSP server failed to start")
        else:
            print(f"❌ LSP start request failed: {response.status_code}")
    except Exception as e:
        print(f"❌ LSP test failed: {e}")

if __name__ == "__main__":
    test_lsp_server()
"""

    with open("test_lsp_integration.py", "w") as f:
        f.write(test_script)

    print("📝 Created test_lsp_integration.py")


def main():
    print("🚀 Language Server Installation")
    print("=" * 50)

    # Check Python
    if not check_command_exists("python") and not check_command_exists("python3"):
        print("❌ Python not found. Please install Python first.")
        return

    print("✅ Python is available")

    # Install language servers
    python_success = install_python_lsp()
    typescript_success = install_typescript_lsp()

    # Test installations
    test_language_servers()

    # Create test script
    create_lsp_test_script()

    print("\n" + "=" * 50)
    print("📊 Installation Summary:")
    print(f"Python LSP:     {'✅ Installed' if python_success else '❌ Failed'}")
    print(f"TypeScript LSP: {'✅ Installed' if typescript_success else '❌ Failed'}")

    if python_success or typescript_success:
        print("\n🎉 Language servers installed!")
        print("\n💡 Next steps:")
        print("1. Restart your IDE backend: python backend/main.py")
        print("2. Open a Python or TypeScript file in the IDE")
        print("3. You should see 'LSP: Ready' indicator in the editor")
        print("4. Try code completion (Ctrl+Space)")
        print("5. Try go-to-definition (Ctrl+Click or F12)")
        print("6. Test with: python test_lsp_integration.py")
    else:
        print("\n❌ No language servers were installed successfully")
        print("Please check the error messages above and try manual installation:")
        print("  pip install python-lsp-server[all]")
        print("  npm install -g typescript-language-server typescript")


if __name__ == "__main__":
    main()
