# orchestrator.py
from pathlib import Path
from typing import List, Dict
from config import DEFAULT_CODE_MODEL, LANGUAGE_MODEL_MAP, EMBEDDING_MODEL
from ollama_client import generate as ollama_generate, embed
import os
try:
    from backend.cloud_client import cloud_client
except Exception:
    cloud_client = None
from vector_store import VectorStore

# Load (or create) the FAISS DB once – it lives in memory for the process
VECTOR_STORE = VectorStore()


def _pick_model(file_extension: str, explicit: str | None = None) -> str:
    """
    Choose a model based on file extension (e.g. ".py") or an explicit user‑selection.
    """
    if explicit:
        return explicit
    # Normalise extension (strip leading dot)
    ext = file_extension.lower().lstrip(".")
    return LANGUAGE_MODEL_MAP.get(ext, LANGUAGE_MODEL_MAP.get("*", DEFAULT_CODE_MODEL))


def _retrieve_context(prompt: str, k: int = 5) -> List[Dict]:
    """Embeds the prompt and returns the k most similar project chunks."""
    q_vec = embed(prompt, model=EMBEDDING_MODEL)
    return VECTOR_STORE.search(q_vec, k=k)


def build_prompt(user_prompt: str, context_chunks: List[Dict]) -> str:
    """
    Build a richer prompt that contains relevant code snippets.
    The format is deliberately simple – you can tweak it later.
    """
    intro = (
        "You are an offline AI coding assistant. Use the provided "
        "project snippets as context. Answer only with the code or a short explanation."
    )
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
    """
    Main entry‑point used by the UI.
    1️⃣ Retrieve *k* most relevant chunks.
    2️⃣ Build the final prompt.
    3️⃣ Call the selected LLM.
    4️⃣ Return the generated text.
    """
    # 1️⃣ Context retrieval
    context = _retrieve_context(user_prompt, k=top_k)

    # 2️⃣ Prompt construction
    full_prompt = build_prompt(user_prompt, context)

    # 3️⃣ Model selection
    ext = Path(file_path).suffix
    model_name = _pick_model(ext, explicit=model_override)

    # 4️⃣ Generation
    system_prompt = f"You are a coding assistant specialized in {ext.lstrip('.')} files."
    # 4️⃣ Generation – choose provider based on model prefix or availability
    try:
        if model_name.startswith("openai:") and cloud_client and os.getenv("OPENAI_API_KEY"):
            model = model_name.split(":", 1)[1] or "gpt-4"
            cloud_client.setup_openai(os.getenv("OPENAI_API_KEY"))
            return cloud_client.generate_openai(f"{system_prompt}\n\n{full_prompt}", model=model)
        if model_name.startswith("anthropic:") and cloud_client and os.getenv("ANTHROPIC_API_KEY"):
            model = model_name.split(":", 1)[1] or "claude-3-sonnet-20240229"
            cloud_client.setup_anthropic(os.getenv("ANTHROPIC_API_KEY"))
            return cloud_client.generate_anthropic(f"{system_prompt}\n\n{full_prompt}", model=model)
        if model_name.startswith("groq:") and cloud_client and os.getenv("GROQ_API_KEY"):
            model = model_name.split(":", 1)[1] or "llama3-8b-8192"
            return cloud_client.generate_groq(f"{system_prompt}\n\n{full_prompt}", api_key=os.getenv("GROQ_API_KEY"), model=model)
        # Default to Ollama
        return ollama_generate(
            model=model_name,
            system_prompt=system_prompt,
            user_prompt=full_prompt,
            temperature=0.2,
            max_tokens=1500,
        )
    except Exception:
        # Fallback to Ollama if cloud call fails
        return ollama_generate(
            model=model_name,
            system_prompt=system_prompt,
            user_prompt=full_prompt,
            temperature=0.2,
            max_tokens=1500,
        )
