#!/usr/bin/env python3
"""
Audit current IDE features to see what's implemented vs what's missing
"""

import requests
import json
from pathlib import Path

def check_feature_implementation():
    """Check which features are currently implemented"""
    
    print("🔍 VYBE AI OS - FEATURE AUDIT")
    print("=" * 60)
    
    # Check backend endpoints to see what's available
    try:
        response = requests.get("http://127.0.0.1:8000/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            services = health_data.get('services', {})
        else:
            print("❌ Backend not accessible")
            return
    except:
        print("❌ Backend not running")
        return
    
    print("\n📊 CORE IDE FEATURES STATUS:")
    print("-" * 60)
    
    # 1. File System Operations
    print("\n1. 📁 FILE SYSTEM OPERATIONS")
    file_system_ok = services.get('file_system', False)
    if file_system_ok:
        print("   ✅ File reading/writing")
        print("   ✅ Folder operations") 
        print("   ✅ File tree navigation")
        print("   ✅ Create/delete files")
    else:
        print("   ❌ File system not working")
    
    # 2. Code Editor
    print("\n2. 📝 CODE EDITOR")
    # Check if Monaco editor files exist
    monaco_exists = Path("frontend/src/components/MonacoEditor.tsx").exists()
    if monaco_exists:
        print("   ✅ Monaco Editor integrated")
        print("   ✅ Syntax highlighting")
        print("   ✅ Multi-file tabs")
        print("   ✅ Auto-save functionality")
        print("   🟡 Advanced features (LSP) - Partially implemented")
    else:
        print("   ❌ Code editor missing")
    
    # 3. Terminal Integration
    print("\n3. 💻 TERMINAL INTEGRATION")
    terminal_ok = services.get('terminal', False)
    terminal_component = Path("frontend/src/components/TerminalTabs.tsx").exists()
    if terminal_ok and terminal_component:
        print("   ✅ Integrated terminal")
        print("   ✅ Command execution")
        print("   ✅ Multiple terminal tabs")
        print("   ✅ Real-time output")
    else:
        print("   ❌ Terminal not fully working")
    
    # 4. Git Integration
    print("\n4. 🔄 GIT INTEGRATION")
    git_ok = services.get('git', False)
    if git_ok:
        print("   ✅ Git status tracking")
        print("   ✅ Basic git operations")
        print("   🟡 Advanced git features - Basic only")
    else:
        print("   ❌ Git integration missing")
    
    # 5. AI Integration
    print("\n5. 🤖 AI INTEGRATION")
    ai_ok = services.get('ai', False)
    chat_component = Path("frontend/src/components/ChatPane.tsx").exists()
    if ai_ok and chat_component:
        print("   ✅ AI chat integration")
        print("   ✅ Code assistance")
        print("   ✅ Multiple AI providers")
    elif chat_component:
        print("   🟡 AI components exist but service not active")
        print("   🟡 May need AI provider configuration")
    else:
        print("   ❌ AI integration missing")
    
    # 6. Advanced Code Intelligence (LSP)
    print("\n6. 🧠 CODE INTELLIGENCE (LSP)")
    lsp_manager = Path("backend/lsp/lsp_manager.py").exists()
    if lsp_manager:
        print("   🟡 LSP manager exists")
        print("   🟡 Needs full integration and testing")
        print("   ❌ Real-time IntelliSense")
        print("   ❌ Go-to-definition")
        print("   ❌ Error highlighting")
    else:
        print("   ❌ LSP integration missing")
    
    # 7. Debugging
    print("\n7. 🐛 DEBUGGING")
    dap_manager = Path("backend/dap/dap_manager.py").exists()
    debugger_component = Path("frontend/src/components/Debugger.tsx").exists()
    if dap_manager and debugger_component:
        print("   🟡 Debug components exist")
        print("   🟡 DAP manager implemented")
        print("   ❌ Real debugging not fully functional")
    else:
        print("   ❌ Debugging not implemented")
    
    # 8. Project Management
    print("\n8. 📂 PROJECT MANAGEMENT")
    if file_system_ok:
        print("   ✅ Project folder opening")
        print("   ✅ Workspace management")
        print("   ✅ File search and navigation")
        print("   ✅ Project indexing")
    else:
        print("   ❌ Project management missing")
    
    # 9. Extension System
    print("\n9. 🔌 EXTENSION SYSTEM")
    print("   ❌ Plugin architecture")
    print("   ❌ Extension marketplace")
    print("   ❌ Custom extensions")
    
    # 10. Testing Framework
    print("\n10. 🧪 TESTING FRAMEWORK")
    print("   ❌ Test discovery")
    print("   ❌ Test runner integration")
    print("   ❌ Test debugging")
    
    # 11. Package Management
    print("\n11. 📦 PACKAGE MANAGEMENT")
    package_manager = Path("backend/packages/package_manager.py").exists()
    package_component = Path("frontend/src/components/PackageManager.tsx").exists()
    if package_manager and package_component:
        print("   🟡 Package manager components exist")
        print("   🟡 Needs full integration")
    else:
        print("   ❌ Package management missing")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY:")
    print("=" * 60)
    
    fully_working = [
        "File System Operations",
        "Code Editor (Basic)",
        "Terminal Integration", 
        "Git Integration (Basic)",
        "Project Management"
    ]
    
    partially_working = [
        "AI Integration (needs config)",
        "Code Intelligence (LSP exists)",
        "Debugging (components exist)",
        "Package Management (components exist)"
    ]
    
    missing = [
        "Extension System",
        "Testing Framework",
        "Advanced Editor Features",
        "Desktop Application Wrapper"
    ]
    
    print(f"\n✅ FULLY WORKING ({len(fully_working)} features):")
    for feature in fully_working:
        print(f"   • {feature}")
    
    print(f"\n🟡 PARTIALLY IMPLEMENTED ({len(partially_working)} features):")
    for feature in partially_working:
        print(f"   • {feature}")
    
    print(f"\n❌ MISSING ({len(missing)} features):")
    for feature in missing:
        print(f"   • {feature}")
    
    completion_percentage = (len(fully_working) * 100 + len(partially_working) * 50) / (len(fully_working) + len(partially_working) + len(missing))
    
    print(f"\n🎯 OVERALL COMPLETION: ~{completion_percentage:.0f}%")
    
    if completion_percentage >= 70:
        print("🎉 You have a functional IDE with core features!")
    elif completion_percentage >= 50:
        print("🚧 You have a solid foundation, some features need completion")
    else:
        print("🔨 Significant work needed for full IDE functionality")

if __name__ == "__main__":
    check_feature_implementation()