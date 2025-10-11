from pathlib import Path
from config import DEFAULT_CODE_MODEL, LANGUAGE_MODEL_MAP, EMBEDDING_MODEL
from ollama_client import generate, embed
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vector_store import VectorStore

VECTOR_STORE = VectorStore()

def _pick_model(file_extension: str, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    ext = file_extension.lower().lstrip(".")
    return LANGUAGE_MODEL_MAP.get(ext, LANGUAGE_MODEL_MAP.get("*", DEFAULT_CODE_MODEL))

def _retrieve_context(prompt: str, k: int = 5) -> list[dict]:
    q_vec = embed(prompt, model=EMBEDDING_MODEL)
    return VECTOR_STORE.search(q_vec, k=k)

def build_prompt(user_prompt: str, context_chunks: list[dict]) -> str:
    intro = "You are an offline AI coding assistant. Use the provided project snippets as context. Answer only with the code or a short explanation."
    snippets = "\n\n---\n".join(
        f"# File: {c['file']} (lines {c['start_line']}-{c['end_line']})\n{c['text']}"
        for c in context_chunks
    )
    return f"{intro}\n\nContext snippets:\n{snippets}\n\nUser request:\n{user_prompt}"

def handle_request(
    user_prompt: str,
    file_path: str,
    model_override: str | None = None,
    top_k: int = 5,
) -> str:
    context = _retrieve_context(user_prompt, k=top_k)
    full_prompt = build_prompt(user_prompt, context)
    ext = Path(file_path).suffix
    model_name = _pick_model(ext, explicit=model_override)
    system_prompt = f"You are a coding assistant specialized in {ext.lstrip('.')} files."
    result = generate(
        model=model_name,
        system_prompt=system_prompt,
        user_prompt=full_prompt,
        temperature=0.2,
        max_tokens=1500,
    )
    return result