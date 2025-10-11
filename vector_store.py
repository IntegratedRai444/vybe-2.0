# vector_store.py
import faiss
import json
import os
from pathlib import Path
import numpy as np
from config import INDEX_DIR, EMBEDDING_DIM

INDEX_PATH = INDEX_DIR / "project.index"
META_PATH = INDEX_DIR / "metadata.json"


class VectorStore:
    """FAISS index + simple JSON metadata storage."""

    def __init__(self):
        if INDEX_PATH.exists():
            self.index = faiss.read_index(str(INDEX_PATH))
            with open(META_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
        else:
            self.index = faiss.IndexFlatIP(EMBEDDING_DIM)  # inner product (cosine after norm)
            self.metadata = []  # list of dicts: {id, file, start_line, end_line, text}

    def add(self, vectors: list[list[float]], metadatas: list[dict]):
        """Add a batch of vectors + per‑vector metadata."""
        vec_np = np.array(vectors).astype("float32")
        # Normalise for cosine similarity
        faiss.normalize_L2(vec_np)
        self.index.add(vec_np)

        start_id = len(self.metadata)
        for i, meta in enumerate(metadatas):
            meta["id"] = start_id + i
            self.metadata.append(meta)

    def search(self, query_vec: list[float], k: int = 5) -> list[dict]:
        """Return top‑k metadata entries sorted by similarity."""
        query_np = np.array([query_vec]).astype("float32")
        faiss.normalize_L2(query_np)
        D, I = self.index.search(query_np, k)
        results = []
        for idx, score in zip(I[0], D[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx].copy()
            meta["score"] = float(score)
            results.append(meta)
        return results

    def persist(self):
        """Write FAISS index and metadata to disk."""
        faiss.write_index(self.index, str(INDEX_PATH))
        with open(META_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
