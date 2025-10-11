import requests
import os
import git
import time

API_BASE_URL = "http://127.0.0.1:8000"
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

def print_status(text, status):
    print(f"{text}: [ {'PASS' if status else 'FAIL'} ]")

def test_git_features():
    print("\n--- Testing Git Features ---")
    repo = git.Repo(PROJECT_ROOT)
    original_branch = repo.active_branch.name
    test_branch_name = f"test-branch-{int(time.time())}"
    
    # 1. Create and checkout a new branch
    repo.git.checkout('-b', test_branch_name)
    print(f"Created and switched to branch: {test_branch_name}")
    
    # 2. Verify branches endpoint
    res = requests.get(f"{API_BASE_URL}/git/branches", params={"root": PROJECT_ROOT})
    assert res.status_code == 200
    branches_data = res.json()
    assert test_branch_name in branches_data['branches']
    assert branches_data['current'] == test_branch_name
    print_status("Branch creation and listing", True)

    # 3. Modify a file
    readme_path = os.path.join(PROJECT_ROOT, 'README.md')
    with open(readme_path, 'a') as f:
        f.write("\n# Test line")
    
    # 4. Verify status endpoint
    res = requests.get(f"{API_BASE_URL}/git/status", params={"root": PROJECT_ROOT})
    assert res.status_code == 200
    status_data = res.json()
    is_modified = any(f['path'] == 'README.md' and f['status'] == 'M' for f in status_data['unstaged'])
    print_status("File modification status", is_modified)

    # 5. Verify diff endpoint
    res = requests.get(f"{API_BASE_URL}/git/diff", params={"root": PROJECT_ROOT, "path": "README.md"})
    assert res.status_code == 200
    diff_data = res.json()
    assert "+Test line" in diff_data['diff']
    print_status("File diff generation", True)

    # Cleanup
    repo.git.checkout(original_branch)
    repo.git.branch('-D', test_branch_name)
    repo.git.restore(readme_path)
    print("\nGit test cleanup complete.")

def test_streaming_chat():
    print("\n--- Testing Streaming Chat ---")
    try:
        res = requests.post(
            f"{API_BASE_URL}/chat", 
            json={"message": "Hello", "root": PROJECT_ROOT, "current_file": ""},
            stream=True
        )
        res.raise_for_status()
        
        chunks_received = 0
        for chunk in res.iter_lines():
            if chunk:
                chunks_received += 1
        
        print_status("Chat response is streaming", chunks_received > 0)
    except requests.RequestException as e:
        print_status(f"Chat streaming request failed: {e}", False)

if __name__ == "__main__":
    # Give server a moment to start
    time.sleep(2)
    
    try:
        test_git_features()
        test_streaming_chat()
    except Exception as e:
        print(f"\nAn error occurred during tests: {e}")
    finally:
        print("\nEnd-to-end tests finished.")
