# 🚀 Vybe AI OS - AI-Powered Development Environment

**The Next-Generation AI-Native IDE with Integrated MCP Debugging System**

Vybe is a complete AI-powered development environment built with React, FastAPI, and Ollama. It combines the power of local AI models with advanced code analysis and auto-debugging capabilities.

## 📁 Project Structure

```
vybe-2.0/
├── backend/               # Backend services and API
│   ├── ai/               # AI model integrations
│   ├── api/              # API endpoints
│   ├── services/         # Business logic
│   └── ...
├── frontend/             # Frontend application
│   ├── public/           # Static files
│   └── src/              # Source code
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       └── ...
├── config/               # Configuration files
│   ├── alembic.ini       # Database migrations
│   └── ...
├── docs/                 # Documentation
│   ├── architecture/     # Architecture decisions
│   └── guides/           # How-to guides
├── scripts/              # Utility scripts
│   └── deployment/       # Deployment scripts
└── ...
```

## 📚 Documentation

- [Getting Started](/docs/QUICK_START.md)
- [Architecture Overview](/docs/ARCHITECTURE.md)
- [API Documentation](/docs/API.md)
- [Development Guide](/docs/DEVELOPMENT.md)
- [Deployment Guide](/docs/DEPLOYMENT.md)

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- Docker (optional)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/vybe-2.0.git
   cd vybe-2.0
   ```

2. Set up the backend:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:

   ```bash
   cd ../frontend
   npm install
   ```

4. Configure environment variables:

   ```bash
   cp .env.example .env
   # Update the .env file with your configuration
   ```

5. Start the development servers:

   ```bash
   # In the backend directory
   uvicorn main:app --reload

   # In the frontend directory
   npm run dev
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ✨ **Features**

### 🎯 **Core IDE Features**

- ✅ **File Tree Navigation** - Full project explorer with folder management
- ✅ **Monaco Code Editor** - Professional code editing with syntax highlighting
- ✅ **Multi-Tab Support** - Work on multiple files simultaneously
- ✅ **AI Chat Interface** - Context-aware coding assistant
- ✅ **Integrated Terminal** - Run commands directly in the IDE
- ✅ **Git Integration** - Full version control (status, diff, commit, push, pull, clone)
- ✅ **Code Formatting** - Auto-format with Black, Prettier, gofmt, rustfmt
- ✅ **Linting** - Real-time code quality checks
- ✅ **Search & Replace** - Project-wide find and replace
- ✅ **Quick Open** - Fast file navigation (Cmd+P)
- ✅ **Package Manager** - Install npm/pip packages from UI
- ✅ **Deployment** - One-click deploy to Vercel/Netlify

### 🤖 **AI Orchestrator** (Multi-Provider Support)

- ✅ **Ollama** - Local AI models (CodeLlama, Llama2, etc.)
- ✅ **OpenAI** - GPT-3.5/GPT-4 integration
- ✅ **Anthropic** - Claude integration
- ✅ **Groq** - Fast inference with Groq
- ✅ **LangChain** - Agent framework with tool calling
- ✅ **Tabby** - Code completion server
- ✅ **LM Studio** - Local model management
- ✅ **Transformers** - HuggingFace models
- ✅ **Auto-Switching** - Automatically picks best available provider

### 🔍 **MCP Debugging System** (NEW!)

The core differentiator - AI-powered auto-debug and fix system:

- ✅ **Multi-Language Scanner** - Analyzes Python, JavaScript, TypeScript
- ✅ **Static Analysis** - Flake8, Mypy, Bandit, ESLint integration
- ✅ **AI Fix Generator** - LLM-powered code fixes
- ✅ **Safe Patch Executor** - Applies fixes with automatic backups
- ✅ **Issue Explainer** - Detailed explanations of code issues
- ✅ **One-Click Debug** - Scan and fix entire project
- ✅ **Auto-Fix Mode** - Automatically apply AI-generated fixes
- ✅ **Issue Categorization** - Syntax, Type, Security, Style, Performance
- ✅ **Severity Levels** - Error, Warning, Info, Hint

### 📊 **Project Management**

- ✅ **Vector Store** - FAISS-powered semantic code search
- ✅ **Project Indexing** - Fast code understanding
- ✅ **File Operations** - Create, delete, rename files/folders
- ✅ **Problems Panel** - View all issues in one place
- ✅ **Git Panel** - Visual git interface

### 🔒 **Security & Sandboxing**

- ✅ **Docker Sandbox** - Isolated code execution (Python, JS, Shell)
- ✅ **Vulnerability Scanner** - Dependency security checks
- ✅ **Secrets Detector** - Find hardcoded credentials (20+ patterns)
- ✅ **Security Dashboard** - Comprehensive security overview

### 💬 **Chat Persistence**

- ✅ **SQLite Database** - Persistent chat history
- ✅ **Session Management** - Create, load, delete sessions
- ✅ **Export** - JSON and Markdown formats
- ✅ **Search** - Full-text search across conversations

### 🧪 **Testing Infrastructure**

- ✅ **Multi-Framework** - pytest, unittest, doctest support
- ✅ **Test Discovery** - Automatic test file detection
- ✅ **Coverage Reports** - Code coverage analysis
- ✅ **Test Runner** - Execute tests from UI

### ⚡ **Code Profiling**

- ✅ **Performance Profiling** - cProfile integration
- ✅ **Memory Profiling** - Track memory usage
- ✅ **Hotspot Analysis** - Identify performance bottlenecks
- ✅ **Benchmarking** - Compare function implementations

### 📈 **Code Analysis**

- ✅ **Complexity Metrics** - Cyclomatic complexity
- ✅ **Maintainability Index** - Code quality scoring
- ✅ **Code Smells** - Detect anti-patterns
- ✅ **Dependency Analysis** - Import tracking
- ✅ **Project Metrics** - Comprehensive statistics

### 🎨 **Theme System**

- ✅ **Dark Mode** - Professional dark theme
- ✅ **Light Mode** - Clean light theme
- ✅ **Auto Mode** - Follow system preferences
- ✅ **Persistence** - Remember theme choice

### ⚙️ **Layout Customization** (NEW!)

- ✅ **Resizable Panels** - Adjust panel sizes dynamically
- ✅ **Layout Presets** - Default, Coding, Debugging, Reviewing, Minimal
- ✅ **Panel Visibility** - Show/hide any panel
- ✅ **Persistent Layouts** - Save your preferred layout
- ✅ **Custom Arrangements** - Create your perfect workspace

### 👥 **Collaborative Editing** (NEW!)

- ✅ **Real-Time Collaboration** - Edit files together
- ✅ **WebSocket Support** - Low-latency synchronization
- ✅ **User Presence** - See who's editing
- ✅ **Cursor Tracking** - View collaborator cursors
- ✅ **Session Management** - Create and join sessions
- ✅ **Conflict Resolution** - Automatic merge handling

### 🚀 **CI/CD Pipeline** (NEW!)

- ✅ **GitHub Actions** - Automated workflows
- ✅ **Automated Testing** - Run tests on every push
- ✅ **Code Quality Checks** - Flake8, Bandit, Black
- ✅ **Security Scanning** - Trivy vulnerability scanner
- ✅ **Docker Build** - Automated image builds
- ✅ **Deployment Automation** - Staging and production
- ✅ **Dependency Updates** - Weekly automated updates
- ✅ **Release Management** - Automated releases

---

## 🛠️ **Setup**

### **Prerequisites**

- Python 3.8+
- Node.js 16+
- Ollama (for local AI)
- Git

### **Installation**

1. **Clone the repository:**

```bash
git clone <your-repo-url>
cd "vybe 2.0"
```

2. **Install Python dependencies:**

```bash
pip install -r requirements.txt
```

3. **Install frontend dependencies:**

```bash
cd frontend
npm install
cd ..
```

4. **Install Ollama and pull a model:**

```bash
# Install Ollama from https://ollama.ai
ollama pull codellama:7b
# or
ollama pull llama2:7b
```

5. **Optional: Install code analyzers for MCP:**

```bash
# Python analyzers
pip install flake8 mypy bandit pylint

# JavaScript analyzer (if you have Node.js)
npm install -g eslint
```

---

## 🚀 **Running**

### **Option 1: Use the run script (recommended)**

```bash
python run.py
```

### **Option 2: Manual startup**

```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **Access the IDE**

1. Open http://localhost:5173
2. Click "Open Project"
3. Enter the absolute path to your project
4. Start coding with AI assistance!

---

## 🎮 **Usage**

### **Keyboard Shortcuts**

- `Cmd/Ctrl + S` - Save file
- `Cmd/Ctrl + P` - Quick open file
- `Cmd/Ctrl + N` - New file
- `Cmd/Ctrl + F` - Find & replace
- `Cmd/Ctrl + W` - Close tab
- `Cmd/Ctrl + Shift + G` - Toggle Gradio UI

### **MCP Debugging System**

1. Click the **"Debug"** button in the toolbar
2. View scan results with issue breakdown
3. Click **"Auto-Fix"** to automatically fix issues
4. Review changes in the Problems panel

### **AI Chat**

1. Open the Chat panel (right side)
2. Ask questions about your code
3. Request code generation or explanations
4. AI has full project context via vector store

### **Git Operations**

1. Open Git panel (right side)
2. View changed files
3. Stage, commit, push, pull
4. Switch branches
5. View diffs

---

## 📁 **Architecture**

```
vybe 2.0/
├── backend/                    # FastAPI server
│   ├── main.py                # API endpoints
│   ├── ollama_client.py       # Ollama integration
│   ├── cloud_client.py        # OpenAI/Anthropic/Groq
│   ├── langchain_client.py    # LangChain agents
│   ├── tabby_client.py        # Tabby completion
│   ├── lmstudio_client.py     # LM Studio
│   ├── transformers_client.py # HuggingFace
│   ├── orchestrator.py        # AI orchestration
│   ├── vector_store.py        # FAISS embeddings
│   ├── indexer.py             # Project indexing
│   ├── git_utils.py           # Git operations
│   ├── terminal.py            # Terminal integration
│   ├── auto_model.py          # Auto provider switching
│   └── mcp/                   # MCP Debugging System
│       ├── main.py            # MCP orchestrator
│       ├── scanner.py         # Code scanner
│       ├── llm_fixer.py       # AI fix generator
│       ├── patch_executor.py  # Patch application
│       ├── explainer.py       # Issue explainer
│       ├── config.py          # MCP configuration
│       ├── models.py          # Data models
│       └── analyzers/         # Language analyzers
│           ├── python_analyzer.py
│           ├── js_analyzer.py
│           └── generic_analyzer.py
├── frontend/                  # React app
│   └── src/
│       ├── App.tsx            # Main layout
│       ├── components/        # UI components
│       │   ├── FileTree.tsx
│       │   ├── CodeEditor.tsx
│       │   ├── ChatPane.tsx
│       │   ├── GitPanel.tsx
│       │   ├── TerminalTabs.tsx
│       │   ├── DebugButton.tsx  # NEW!
│       │   └── ...
│       └── utils/
│           └── api.ts         # API client
├── requirements.txt           # Python dependencies
├── package.json              # Node dependencies
└── run.py                    # Startup script
```

---

## 🔧 **Configuration**

### **AI Providers**

Configure API keys in the UI or environment variables:

```bash
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export GROQ_API_KEY="your-key"
```

### **MCP Analyzers**

Configure which analyzers to use in `backend/mcp/config.py`:

```python
LANGUAGE_ANALYZERS = {
    "python": ["flake8", "mypy", "bandit"],
    "javascript": ["eslint"],
    "typescript": ["eslint", "tsc"],
}
```

---

## 📊 **API Endpoints**

### **Core**

- `POST /index` - Index project
- `POST /search` - Semantic search
- `POST /generate` - AI generation
- `POST /chat` - AI chat
- `POST /complete` - Code completion

### **Files**

- `GET /files` - List files
- `GET /file/content` - Get file
- `POST /file/save` - Save file
- `POST /file/create` - Create file
- `DELETE /file/delete` - Delete file
- `POST /file/rename` - Rename file

### **Git**

- `GET /git/status` - Git status
- `GET /git/diff` - File diff
- `POST /git/stage` - Stage files
- `POST /git/commit` - Commit
- `POST /git/push` - Push to remote
- `POST /git/pull` - Pull from remote
- `POST /git/clone` - Clone repository
- `GET /git/remotes` - List remotes

### **MCP Debugging**

- `POST /mcp/scan` - Scan project
- `POST /mcp/fix` - Generate fixes
- `POST /mcp/explain` - Explain issue
- `POST /mcp/debug` - One-click debug
- `GET /mcp/health` - Check analyzers

### **Other**

- `POST /format` - Format code
- `POST /deploy` - Deploy project
- `GET /packages` - List packages
- `POST /packages/install` - Install package
- `WS /ws/terminal` - Terminal WebSocket

---

## 🎯 **Roadmap**

### **Phase 1: MCP Debugging System** ✅ COMPLETE

- [x] Multi-language scanner
- [x] AI fix generator
- [x] Patch executor
- [x] Debug button UI
- [x] Issue explainer

### **Phase 2: AI Integrations** ✅ COMPLETE

- [x] LangChain integration
- [x] Tabby integration
- [x] LM Studio integration
- [x] Transformers integration

### **Phase 3: Git Enhancements** ✅ COMPLETE

- [x] Push/Pull operations
- [x] Clone repositories
- [x] Remote management

### **Phase 4: Security & Sandboxing** ✅ COMPLETE

- [x] Docker sandbox for code execution
- [x] Security scanning
- [x] Dependency vulnerability checks
- [x] Secrets detection

### **Phase 5: Chat Persistence** ✅ COMPLETE

- [x] SQLite database for chat history
- [x] Session management
- [x] Export to JSON/Markdown
- [x] Search functionality

### **Phase 6: Testing Infrastructure** ✅ COMPLETE

- [x] pytest integration
- [x] unittest support
- [x] doctest support
- [x] Test discovery
- [x] Coverage reports

### **Phase 7: Code Profiling** ✅ COMPLETE

- [x] cProfile integration
- [x] Memory profiling
- [x] Hotspot analysis
- [x] Function benchmarking
- [x] Performance comparison

### **Phase 8: Code Analysis** ✅ COMPLETE

- [x] Complexity analysis
- [x] Maintainability index
- [x] Code smell detection
- [x] Dependency analysis
- [x] Project metrics

### **Phase 9: Theme System** ✅ COMPLETE

- [x] Dark/Light/Auto themes
- [x] Theme persistence
- [x] System theme detection

### **Phase 10: Advanced Features** 📋 PLANNED

- [ ] Layout customization
- [ ] Collaborative editing
- [ ] Plugin system
- [ ] CI/CD pipeline

---

## 🤝 **Contributing**

This is an active development project! Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 **License**

MIT License - feel free to use this project for learning or commercial purposes.

---

## 🙏 **Acknowledgments**

Built with:

- **FastAPI** - Modern Python web framework
- **React** - UI framework
- **Monaco Editor** - VS Code's editor
- **Ollama** - Local AI models
- **FAISS** - Vector similarity search
- **GitPython** - Git integration
- **LangChain** - AI agent framework

---

## 📞 **Support**

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions
- **Documentation**: Check the `/docs` folder

---

## 🎉 **Features Highlight**

### **What Makes Vybe Special?**

1. **🔍 MCP Debugging System** - The only IDE with AI-powered auto-debug and fix
2. **🤖 Multi-Provider AI** - Use any AI provider, automatically switches to best available
3. **📦 All-in-One** - Editor + Terminal + Git + AI + Debugger in one place
4. **🚀 Local-First** - Works completely offline with Ollama
5. **⚡ Fast** - Built with modern tech stack for speed
6. **🎨 Beautiful UI** - Clean, professional interface
7. **🔧 Extensible** - Easy to add new features and integrations

---

**Happy Coding with Vybe! 🚀**
#   v y b e - 2 . 0 
 
 
