import requests
import json
try:
    from .config import OLLAMA_HOST
except ImportError:
    from config import OLLAMA_HOST

_HEADERS = {"Content-Type": "application/json"}

def _post(endpoint: str, payload: dict):
    url = f"{OLLAMA_HOST}{endpoint}"
    r = requests.post(url, headers=_HEADERS, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()

def generate(model: str, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 1024) -> str:
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
    payload = {"model": model, "input": text}
    resp = _post("/api/embeddings", payload)
    return resp.get("embedding", [])

def stream_generate(model: str, prompt: str, system: str = "", temp=0.2):
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": True,
        "temperature": temp
    }
    with requests.post(url, json=payload, stream=True) as r:
        for line in r.iter_lines():
            if line:
                data = json.loads(line)
                yield data.get("response", "")