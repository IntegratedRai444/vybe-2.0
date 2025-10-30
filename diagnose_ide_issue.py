#!/usr/bin/env python3
"""
Diagnostic script to check why the IDE is not opening properly
"""

import requests
import json
import subprocess
import sys
import time
from pathlib import Path

def check_backend():
    """Check backend status"""
    print("🔍 Checking Backend...")
    try:
        response = requests.get("http://127.0.0.1:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend is running")
            print(f"   Status: {data.get('status')}")
            services = data.get('services', {})
            for service, status in services.items():
                status_icon = "✅" if status else "❌"
                print(f"   {status_icon} {service}: {status}")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def check_frontend():
    """Check frontend status"""
    print("\n🔍 Checking Frontend...")
    try:
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running")
            print(f"   Status: {response.status_code}")
            return True
        else:
            print(f"❌ Frontend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend connection failed: {e}")
        return False

def test_file_listing():
    """Test if file listing works"""
    print("\n🔍 Testing File Operations...")
    try:
        response = requests.get(
            "http://127.0.0.1:8000/files",
            params={"root": "."},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            file_count = len(data.get('children', []))
            print(f"✅ File listing works - found {file_count} items")
            
            # Show first few items
            for item in data.get('children', [])[:5]:
                print(f"   📁 {item['name']} ({item['type']})")
            return True
        else:
            print(f"❌ File listing failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ File listing error: {e}")
        return False

def check_processes():
    """Check running processes"""
    print("\n🔍 Checking Processes...")
    try:
        # Check for Python processes
        result = subprocess.run(
            ["powershell", "-Command", "Get-Process | Where-Object {$_.ProcessName -like '*python*'} | Select-Object ProcessName, Id"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            print("✅ Python processes found:")
            print(result.stdout)
        else:
            print("❌ No Python processes found")
        
        # Check for Node processes
        result = subprocess.run(
            ["powershell", "-Command", "Get-Process | Where-Object {$_.ProcessName -like '*node*'} | Select-Object ProcessName, Id"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            print("✅ Node processes found:")
            print(result.stdout)
        else:
            print("❌ No Node processes found")
            
    except Exception as e:
        print(f"❌ Process check failed: {e}")

def check_ports():
    """Check if ports are in use"""
    print("\n🔍 Checking Ports...")
    try:
        result = subprocess.run(
            ["powershell", "-Command", "netstat -an | Select-String ':8000|:5173'"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            print("✅ Ports in use:")
            print(result.stdout)
        else:
            print("❌ No ports found (8000, 5173)")
    except Exception as e:
        print(f"❌ Port check failed: {e}")

def provide_solutions():
    """Provide solutions based on findings"""
    print("\n💡 Solutions:")
    print("=" * 50)
    
    print("\n1. If backend is not running:")
    print("   cd backend")
    print("   python main.py")
    
    print("\n2. If frontend is not running:")
    print("   cd frontend")
    print("   npm install")
    print("   npm run dev")
    
    print("\n3. If both are running but IDE doesn't load:")
    print("   • Open browser manually: http://localhost:5173")
    print("   • Check browser console for errors (F12)")
    print("   • Try incognito/private mode")
    print("   • Clear browser cache")
    
    print("\n4. If folder picker doesn't work:")
    print("   • Click 'Open Folder' button")
    print("   • Try 'Current Directory' quick button")
    print("   • Or type '.' in the path field")
    
    print("\n5. Quick restart:")
    print("   python start_ide_fixed.py")

def main():
    print("🔧 IDE Diagnostic Tool")
    print("=" * 50)
    
    backend_ok = check_backend()
    frontend_ok = check_frontend()
    files_ok = test_file_listing() if backend_ok else False
    
    check_processes()
    check_ports()
    
    print("\n📊 Summary:")
    print("=" * 50)
    print(f"Backend:     {'✅ OK' if backend_ok else '❌ FAILED'}")
    print(f"Frontend:    {'✅ OK' if frontend_ok else '❌ FAILED'}")
    print(f"File Ops:    {'✅ OK' if files_ok else '❌ FAILED'}")
    
    if backend_ok and frontend_ok and files_ok:
        print("\n🎉 Everything looks good!")
        print("   Try opening: http://localhost:5173")
        print("   The IDE should load and you can click 'Open Folder'")
    else:
        provide_solutions()

if __name__ == "__main__":
    main()