# 📦 Vybe AI OS - Installation Guide

Complete step-by-step installation guide for Vybe AI OS.

---

## 📋 **Prerequisites**

Before installing Vybe, ensure you have:

### **Required**
- ✅ **Python 3.8+** - [Download](https://www.python.org/downloads/)
- ✅ **Node.js 16+** - [Download](https://nodejs.org/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Ollama** - [Download](https://ollama.ai/)

### **Optional (for full features)**
- 🔧 **Docker** - For sandboxed code execution
- 🔧 **ESLint** - For JavaScript/TypeScript analysis
- 🔧 **Tabby** - For advanced code completion
- 🔧 **LM Studio** - For local model management

---

## 🚀 **Installation Steps**

### **Step 1: Clone Repository**

```bash
git clone <your-repo-url>
cd "vybe 2.0"
```

### **Step 2: Install Python Dependencies**

```bash
# Install all Python packages
pip install -r requirements.txt

# This includes:
# - FastAPI & Uvicorn (backend server)
# - FAISS (vector search)
# - GitPython (git integration)
# - Flake8, Mypy, Bandit (code analyzers)
# - OpenAI, Anthropic, Groq (AI providers)
# - LangChain (agent framework)
# - Transformers & PyTorch (local models)
```

**Note**: If you encounter issues with `torch`, install it separately:
```bash
# CPU version (smaller)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# GPU version (CUDA 11.8)
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### **Step 3: Install Frontend Dependencies**

```bash
cd frontend
npm install
cd ..
```

### **Step 4: Install Ollama**

1. Download Ollama from https://ollama.ai/
2. Install for your platform (Windows/Mac/Linux)
3. Pull a code model:

```bash
# Recommended: CodeLlama 7B (fast, good quality)
ollama pull codellama:7b

# Alternative: Llama2 7B
ollama pull llama2:7b

# For better quality (requires more RAM):
ollama pull codellama:13b
ollama pull codellama:34b
```

4. Verify Ollama is running:
```bash
ollama list
```

### **Step 5: Install Code Analyzers (Optional but Recommended)**

#### **Python Analyzers**
Already installed with requirements.txt:
- ✅ Flake8 (style checker)
- ✅ Mypy (type checker)
- ✅ Bandit (security scanner)
- ✅ Pylint (comprehensive linter)

#### **JavaScript/TypeScript Analyzers**
```bash
# Install ESLint globally
npm install -g eslint

# Or use npx (no global install needed)
# Vybe will automatically use npx if available
```

### **Step 6: Configure API Keys (Optional)**

If you want to use cloud AI providers:

#### **Option A: Environment Variables**
```bash
# Linux/Mac
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROQ_API_KEY="gsk_..."

# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:GROQ_API_KEY="gsk_..."
```

#### **Option B: .env File**
Create `.env` in the backend directory:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

---

## ✅ **Verification**

### **Test Backend**
```bash
cd backend
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **Test Frontend**
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v4.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### **Test MCP System**
```bash
# Check MCP health
curl http://localhost:8000/mcp/health
```

Expected response:
```json
{
  "status": "healthy",
  "analyzers": {
    "flake8": true,
    "mypy": true,
    "bandit": true,
    "eslint": true
  },
  "mcp_version": "1.0.0"
}
```

---

## 🎮 **First Run**

### **Option 1: Using Run Script (Recommended)**
```bash
python run.py
```

This will:
1. Start the backend server on port 8000
2. Start the frontend dev server on port 5173
3. Open your browser automatically

### **Option 2: Manual Start**

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Ollama (if not running):**
```bash
ollama serve
```

### **Access the IDE**
1. Open http://localhost:5173
2. You should see the Vybe welcome screen
3. Click "Open Project"
4. Enter an absolute path to a project folder
5. Start coding!

---

## 🔧 **Troubleshooting**

### **Backend won't start**

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`
**Solution**: 
```bash
pip install -r requirements.txt
```

**Problem**: `Address already in use: 8000`
**Solution**: 
```bash
# Find and kill process on port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### **Frontend won't start**

**Problem**: `Cannot find module 'react'`
**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Problem**: `Port 5173 already in use`
**Solution**:
```bash
# Change port in vite.config.ts
# Or kill process on 5173
```

### **Ollama not working**

**Problem**: `Connection refused to localhost:11434`
**Solution**:
```bash
# Start Ollama service
ollama serve

# Or restart Ollama app
```

**Problem**: `Model not found`
**Solution**:
```bash
# Pull the model
ollama pull codellama:7b

# List available models
ollama list
```

### **MCP Analyzers not working**

**Problem**: `Analyzer not found: flake8`
**Solution**:
```bash
pip install flake8 mypy bandit
```

**Problem**: `ESLint not found`
**Solution**:
```bash
npm install -g eslint
# Or let Vybe use npx (automatic)
```

### **Git operations failing**

**Problem**: `Git repository not found`
**Solution**:
```bash
# Initialize git in your project
cd /path/to/project
git init
```

**Problem**: `Push/Pull requires authentication`
**Solution**:
```bash
# Configure git credentials
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# For HTTPS, use credential helper
git config --global credential.helper store
```

---

## 🎯 **Optional Installations**

### **Tabby Code Completion Server**

1. Install Tabby:
```bash
# Download from https://github.com/TabbyML/tabby
# Or use Docker
docker run -it --gpus all -p 8080:8080 tabbyml/tabby
```

2. Vybe will automatically detect Tabby on `localhost:8080`

### **LM Studio**

1. Download from https://lmstudio.ai/
2. Install and start the server
3. Load a model in LM Studio
4. Vybe will detect it on `localhost:1234`

### **Docker (for sandboxed execution)**

```bash
# Install Docker Desktop
# Download from https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
```

---

## 📊 **System Requirements**

### **Minimum**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 10 GB free
- OS: Windows 10+, macOS 10.15+, Linux

### **Recommended**
- CPU: 8+ cores
- RAM: 16 GB
- Storage: 20 GB free (for models)
- GPU: NVIDIA GPU with 8GB+ VRAM (for local models)
- OS: Windows 11, macOS 12+, Ubuntu 20.04+

### **For Large Models (CodeLlama 34B, etc.)**
- RAM: 32 GB+
- GPU: NVIDIA GPU with 24GB+ VRAM
- Storage: 50 GB free

---

## 🚀 **Performance Tips**

### **Speed up Ollama**
```bash
# Use smaller models for faster responses
ollama pull codellama:7b  # Fast
ollama pull codellama:13b # Balanced
ollama pull codellama:34b # Slow but accurate

# Enable GPU acceleration (automatic if available)
```

### **Reduce Memory Usage**
```bash
# Use CPU-only PyTorch
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Disable Transformers client if not needed
# (comment out in requirements.txt)
```

### **Faster Frontend**
```bash
# Build for production
cd frontend
npm run build

# Serve with production server
npm install -g serve
serve -s dist -p 5173
```

---

## 📝 **Next Steps**

After installation:

1. ✅ Read the [User Guide](USER_GUIDE.md)
2. ✅ Try the MCP Debugging System
3. ✅ Explore AI chat features
4. ✅ Configure your preferred AI provider
5. ✅ Customize keyboard shortcuts
6. ✅ Join the community discussions

---

## 🆘 **Getting Help**

- 📖 **Documentation**: Check `/docs` folder
- 🐛 **Bug Reports**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@vybe.ai (if available)

---

**Installation Complete! Happy Coding! 🎉**