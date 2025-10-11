# 📖 Vybe AI OS - User Guide

Complete guide to using Vybe AI OS effectively.

---

## 🎯 **Table of Contents**

1. [Getting Started](#getting-started)
2. [File Management](#file-management)
3. [Code Editing](#code-editing)
4. [AI Features](#ai-features)
5. [MCP Debugging System](#mcp-debugging-system)
6. [Git Integration](#git-integration)
7. [Terminal](#terminal)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Tips & Tricks](#tips--tricks)

---

## 🚀 **Getting Started**

### **Opening a Project**

1. Launch Vybe (run `python run.py`)
2. Click **"Open Project"** button
3. Enter the **absolute path** to your project folder
   - Windows: `C:\Users\YourName\Projects\myproject`
   - Mac/Linux: `/Users/yourname/projects/myproject`
4. Click OK

The IDE will:
- Load the file tree
- Index the project for AI context
- Initialize Git if available
- Scan for issues (if MCP enabled)

### **Interface Overview**

```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar: Project Name | Status | Buttons              │
├──────────┬──────────────────────────────┬───────────────┤
│          │  Tab Bar: Open Files         │               │
│  File    ├──────────────────────────────┤   Chat /      │
│  Tree    │                              │   Git /       │
│          │  Code Editor                 │   Terminal /  │
│          │  (Monaco)                    │   Problems    │
│          │                              │               │
│          ├──────────────────────────────┤               │
│          │  Problems Panel              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

---

## 📁 **File Management**

### **Opening Files**

**Method 1: File Tree**
- Click any file in the left sidebar
- File opens in a new tab

**Method 2: Quick Open (Cmd+P)**
- Press `Cmd/Ctrl + P`
- Type filename
- Select from filtered list
- Press Enter

### **Creating Files**

**Method 1: File Operations Menu**
1. Click the **"+"** button in file tree
2. Select "New File"
3. Enter filename with extension
4. File is created and opened

**Method 2: Keyboard Shortcut**
- Press `Cmd/Ctrl + N`
- Enter filename
- File is created

### **Creating Folders**

1. Click the **"+"** button in file tree
2. Select "New Folder"
3. Enter folder name
4. Folder is created

### **Deleting Files/Folders**

1. Right-click file/folder in tree
2. Select "Delete"
3. Confirm deletion

**⚠️ Warning**: Deletion is permanent!

### **Renaming Files/Folders**

1. Right-click file/folder
2. Select "Rename"
3. Enter new name
4. Press Enter

---

## ✏️ **Code Editing**

### **Basic Editing**

The Monaco editor provides:
- ✅ Syntax highlighting for 100+ languages
- ✅ Auto-indentation
- ✅ Bracket matching
- ✅ Code folding
- ✅ Multi-cursor editing
- ✅ Find & replace
- ✅ IntelliSense (basic)

### **Saving Files**

**Auto-save**: Files are marked dirty (•) when modified

**Manual save**:
- Press `Cmd/Ctrl + S`
- Or click the save icon
- Dirty indicator disappears when saved

### **Code Formatting**

**Auto-format current file**:
1. Open file
2. Click **"Format"** button in toolbar
3. Or use editor context menu

**Supported formatters**:
- **Python**: Black
- **JavaScript/TypeScript**: Prettier
- **Go**: gofmt
- **Rust**: rustfmt

**Install formatters**:
```bash
# Python
pip install black

# JavaScript
npm install -g prettier
```

### **Linting**

**Real-time linting**:
- Issues appear in Problems panel
- Underlined in editor
- Hover for details

**Supported linters**:
- **Python**: Pylint
- **JavaScript/TypeScript**: ESLint

### **Search & Replace**

**Open search**: `Cmd/Ctrl + F`

**Features**:
- Find in current file
- Replace single occurrence
- Replace all occurrences
- Case sensitive search
- Regex support
- Whole word matching

---

## 🤖 **AI Features**

### **AI Chat Assistant**

**Opening chat**:
- Click **"Chat"** tab in right panel
- Or press `Cmd/Ctrl + Shift + C`

**Using chat**:
1. Type your question or request
2. Press Enter or click Send
3. AI responds with context from your project

**Example prompts**:
```
"Explain this function"
"How do I add error handling here?"
"Generate a unit test for this class"
"Refactor this code to be more efficient"
"What does this error mean?"
```

**Context awareness**:
- AI knows about your entire project
- Uses vector search to find relevant code
- Understands current file context

### **Code Completion**

**Trigger completion**:
- Type code naturally
- Completions appear automatically
- Press Tab to accept

**Providers**:
- Ollama (local)
- OpenAI (cloud)
- Tabby (if installed)
- LM Studio (if running)

### **AI Provider Selection**

**Auto mode** (default):
- Automatically picks best available provider
- Falls back if one fails
- Prioritizes: Groq → Anthropic → OpenAI → Ollama

**Manual selection**:
1. Click provider dropdown in chat
2. Select preferred provider
3. Enter API key if needed

### **Switching Models**

**Ollama models**:
```bash
# List available models
ollama list

# Pull new model
ollama pull codellama:13b

# Use in Vybe
# Select from model dropdown
```

---

## 🔍 **MCP Debugging System**

### **What is MCP?**

MCP (Model Context Protocol) is Vybe's AI-powered debugging system that:
- Scans your code for issues
- Categorizes problems by type and severity
- Generates AI-powered fixes
- Applies fixes safely with backups

### **Running a Debug Scan**

**Method 1: Debug Button**
1. Click **"Debug"** button in toolbar
2. Wait for scan to complete
3. View results in modal

**Method 2: Auto-Fix**
1. Click **"Auto-Fix"** button
2. Scan runs automatically
3. AI generates fixes
4. Fixes are applied automatically
5. Backups created in `.mcp_backups/`

### **Understanding Results**

**Scan Summary**:
```
Files Scanned: 45
Errors: 12
Warnings: 28
Info: 15
```

**Issue Details**:
- **File**: Where the issue is
- **Line**: Line number
- **Severity**: Error/Warning/Info/Hint
- **Category**: Syntax/Type/Security/Style/Performance
- **Message**: What's wrong

### **Issue Categories**

| Category | Description | Examples |
|----------|-------------|----------|
| **Syntax** | Code syntax errors | Missing semicolons, invalid syntax |
| **Type** | Type errors | Type mismatches, undefined variables |
| **Security** | Security vulnerabilities | SQL injection, XSS, hardcoded secrets |
| **Style** | Code style issues | Line too long, unused imports |
| **Performance** | Performance problems | Inefficient loops, memory leaks |
| **Bug** | Potential bugs | Logic errors, edge cases |
| **Complexity** | Code complexity | Too many branches, deep nesting |
| **Import** | Import issues | Missing imports, circular imports |

### **Severity Levels**

| Level | Color | Meaning |
|-------|-------|---------|
| **Error** | 🔴 Red | Must fix - code won't work |
| **Warning** | 🟡 Yellow | Should fix - potential issues |
| **Info** | 🔵 Blue | Consider fixing - improvements |
| **Hint** | ⚪ Gray | Optional - suggestions |

### **Reviewing Fixes**

**Before applying**:
1. Review the fix in the modal
2. Check the explanation
3. Understand why it's needed

**After applying**:
1. Check `.mcp_backups/` for original files
2. Test your code
3. Commit changes if satisfied

### **Manual Fix Mode**

**Dry run** (preview only):
```bash
# Via API
POST /mcp/fix
{
  "project_path": "/path/to/project",
  "dry_run": true
}
```

**Apply specific fixes**:
1. Scan project
2. Select specific issues
3. Generate fixes for selected only
4. Review and apply

### **Explaining Issues**

**Get detailed explanation**:
1. Click on an issue
2. Click "Explain" button
3. View:
   - What the issue means
   - Why it's a problem
   - How to fix it
   - Best practices
   - Code examples

---

## 🔀 **Git Integration**

### **Git Panel**

**Opening Git panel**:
- Click **"Git"** tab in right panel
- View changed files
- Stage, commit, push, pull

### **Viewing Changes**

**File status indicators**:
- 🟢 **A** - Added (new file)
- 🟡 **M** - Modified
- 🔴 **D** - Deleted
- ⚪ **??** - Untracked

**View diff**:
1. Click on changed file
2. Diff appears in editor
3. See line-by-line changes

### **Staging Files**

**Stage single file**:
- Click checkbox next to file

**Stage all files**:
- Click "Stage All" button

**Unstage**:
- Uncheck checkbox

### **Committing**

1. Stage files you want to commit
2. Enter commit message
3. Click **"Commit"** button
4. Commit is created

**Good commit messages**:
```
✅ "Add user authentication"
✅ "Fix login bug"
✅ "Refactor database queries"

❌ "Update"
❌ "Fix"
❌ "Changes"
```

### **Pushing & Pulling**

**Push to remote**:
1. Click **"Push"** button
2. Changes uploaded to GitHub/GitLab
3. Confirmation shown

**Pull from remote**:
1. Click **"Pull"** button
2. Latest changes downloaded
3. Files updated automatically

**Handling conflicts**:
- Conflicts shown in editor
- Resolve manually
- Stage resolved files
- Commit merge

### **Branches**

**View branches**:
- Current branch shown in Git panel
- Click to see all branches

**Switch branch**:
1. Click branch dropdown
2. Select branch
3. Files update automatically

**Create branch**:
```bash
# Use terminal
git checkout -b feature/new-feature
```

### **Cloning Repositories**

**Via API**:
```bash
POST /git/clone
{
  "url": "https://github.com/user/repo.git",
  "target_dir": "/path/to/clone",
  "branch": "main"
}
```

---

## 💻 **Terminal**

### **Opening Terminal**

**Method 1**: Click **"Terminal"** tab in right panel

**Method 2**: Click **"+"** to open new terminal

### **Running Commands**

1. Type command in terminal
2. Press Enter
3. Output appears in real-time

**Examples**:
```bash
# Install packages
npm install express
pip install requests

# Run scripts
npm run dev
python script.py

# Git commands
git status
git log

# Build project
npm run build
python setup.py build
```

### **Multiple Terminals**

- Open multiple terminal tabs
- Switch between them
- Each has independent session
- Close with **"×"** button

### **Terminal Features**

- ✅ Real-time output
- ✅ Color support
- ✅ Command history
- ✅ Copy/paste
- ✅ Scrollback buffer

---

## ⌨️ **Keyboard Shortcuts**

### **File Operations**
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + N` | New file |
| `Cmd/Ctrl + P` | Quick open |
| `Cmd/Ctrl + W` | Close tab |

### **Editing**
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + F` | Find & replace |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + /` | Toggle comment |
| `Cmd/Ctrl + D` | Duplicate line |

### **Navigation**
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + G` | Go to line |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + J` | Toggle panel |

### **AI & Tools**
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + C` | Open chat |
| `Cmd/Ctrl + Shift + G` | Toggle Gradio |
| `Cmd/Ctrl + Shift + D` | Debug project |

---

## 💡 **Tips & Tricks**

### **Performance**

**Speed up AI responses**:
- Use smaller models (codellama:7b)
- Enable GPU acceleration
- Use Groq for fastest cloud inference

**Reduce memory usage**:
- Close unused tabs
- Clear terminal output
- Restart backend periodically

### **Productivity**

**Use Quick Open**:
- Faster than clicking through file tree
- Fuzzy search finds files quickly
- `Cmd+P` → type → Enter

**Multi-cursor editing**:
- Hold `Alt` and click
- Edit multiple lines at once
- Great for refactoring

**Code snippets**:
- Ask AI to generate boilerplate
- Save common patterns
- Use AI chat for templates

### **AI Best Practices**

**Be specific**:
```
❌ "Fix this"
✅ "Add error handling for network requests"

❌ "Make it better"
✅ "Refactor to use async/await instead of callbacks"
```

**Provide context**:
```
"In the UserController class, add a method to validate email addresses using regex"
```

**Iterate**:
```
1. "Generate a login function"
2. "Add password hashing"
3. "Add rate limiting"
```

### **MCP Tips**

**Run regularly**:
- Debug before commits
- Catch issues early
- Keep code quality high

**Review fixes**:
- Don't blindly accept all fixes
- Understand what changed
- Test after applying

**Use categories**:
- Fix errors first
- Then warnings
- Info/hints are optional

### **Git Workflow**

**Commit often**:
```
✅ Small, focused commits
✅ Clear messages
✅ One feature per commit
```

**Branch strategy**:
```
main → production
develop → integration
feature/* → new features
bugfix/* → bug fixes
```

**Before pushing**:
1. Run MCP debug
2. Fix critical issues
3. Test locally
4. Commit
5. Push

---

## 🆘 **Common Issues**

### **AI not responding**

**Check**:
1. Is Ollama running? (`ollama list`)
2. Is model pulled? (`ollama pull codellama:7b`)
3. Is backend running? (check port 8000)
4. Try different provider

### **Files not saving**

**Check**:
1. File permissions
2. Disk space
3. Path is valid
4. Backend is running

### **Git operations failing**

**Check**:
1. Git is initialized (`git init`)
2. Remote is configured (`git remote -v`)
3. Credentials are set up
4. Network connection

### **MCP not finding issues**

**Check**:
1. Analyzers installed (`pip list | grep flake8`)
2. File types supported
3. Project path is correct
4. Backend logs for errors

---

## 📚 **Further Reading**

- [Installation Guide](INSTALLATION.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [API Documentation](API.md)
- [Contributing Guide](CONTRIBUTING.md)

---

**Happy Coding with Vybe! 🚀**