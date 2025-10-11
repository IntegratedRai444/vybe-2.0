from pathlib import Path

DEFAULT_CODE_MODEL = "codellama:7b-instruct"
EMBEDDING_MODEL = "all-minilm"
LANGUAGE_MODEL_MAP = {
    "py": "codellama:7b-instruct",
    "js": "llama3:latest",
    "ts": "llama3:latest",
    "cpp": "llama3:latest",
    "c": "llama3:latest",
    "java": "llama3:latest",
    "go": "llama3:latest",
    "*": DEFAULT_CODE_MODEL,
}

CHUNK_SIZE_LINES = 300
CHUNK_OVERLAP_LINES = 30
EMBEDDING_DIM = 384
INDEX_DIR = Path("./faiss_index")
INDEX_DIR.mkdir(parents=True, exist_ok=True)

GRADIO_PORT = 7860
FASTAPI_PORT = 8000
OLLAMA_HOST = "http://127.0.0.1:11434"