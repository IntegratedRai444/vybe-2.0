# ollama_client.py
import json
import requests
from config import OLLAMA_HOST

_HEADERS = {"Content-Type": "application/json"}


def _post(endpoint: str, payload: dict):
    url = f"{OLLAMA_HOST}{endpoint}"
    r = requests.post(url, headers=_HEADERS, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()


def generate(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> str:
    """
    Sends a ChatML‑style request to Ollama and returns the generated text.
    """
    payload = {
        "model": model,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
        "temperature": temperature,
        "max_gen": max_tokens,
    }
    resp = _post("/api/generate", payload)
    return resp.get("response", "")


def embed(text: str, model: str) -> list[float]:
    """
    Returns a list of floats – the embedding for *text* using the given model.
    """
    payload = {"model": model, "input": text}
    resp = _post("/api/embeddings", payload)
    return resp.get("embedding", [])
