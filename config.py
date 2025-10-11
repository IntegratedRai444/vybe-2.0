# config.py
from pathlib import Path

# ----------------------------------------------------------------------
# 1️⃣ Model configuration
# ----------------------------------------------------------------------
# Name of the Ollama model that will be used for **code generation**.
DEFAULT_CODE_MODEL = "codellama:7b-instruct"

# Name of the Ollama model that will be used for **embeddings**.
# Many models work; `all-minilm` is tiny and fast.
EMBEDDING_MODEL = "all-minilm"

# Simple language → model routing (you can extend it)
LANGUAGE_MODEL_MAP = {
    "py": "codellama:7b-instruct",
    "js": "llama3:latest",
    "ts": "llama3:latest",
    "cpp": "llama3:latest",
    "c": "llama3:latest",
    "java": "llama3:latest",
    "go": "llama3:latest",
    # fallback
    "*": DEFAULT_CODE_MODEL,
}

# ----------------------------------------------------------------------
# 2️⃣ Indexing configuration
# ----------------------------------------------------------------------
CHUNK_SIZE_LINES = 300          # how many source lines per chunk
CHUNK_OVERLAP_LINES = 30        # overlap to keep context between chunks
EMBEDDING_DIM = 384             # dimension of `all-minilm` embeddings (fixed)

# Where FAISS+metadata will be stored (persist between runs)
INDEX_DIR = Path("./faiss_index")
INDEX_DIR.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------
# 3️⃣ UI / Server configuration
# ----------------------------------------------------------------------
GRADIO_PORT = 7860
FASTAPI_PORT = 8000
OLLAMA_HOST = "http://127.0.0.1:11434"
