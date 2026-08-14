# ollama_client.py
import json

import requests

from config import OLLAMA_HOST

_HEADERS = {"Content-Type": "application/json"}


def _post(endpoint: str, payload: dict):
    try:
        url = f"{OLLAMA_HOST}{endpoint}"
        r = requests.post(url, headers=_HEADERS, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        raise Exception("Cannot connect to Ollama. Please make sure Ollama is running.")
    except requests.exceptions.Timeout:
        raise Exception("Ollama request timed out. The model might be loading.")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            raise Exception(
                f"Model not found. Please run: ollama pull {payload.get('model', 'llama2')}"
            )
        else:
            raise Exception(f"Ollama error: {e.response.text}")
    except Exception as e:
        raise Exception(f"Unexpected error: {str(e)}")


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
