# indexer.py
import os
from pathlib import Path
from tqdm import tqdm
from typing import List, Tuple
from config import CHUNK_SIZE_LINES, CHUNK_OVERLAP_LINES, EMBEDDING_MODEL
from ollama_client import embed
from vector_store import VectorStore


def _read_file(path: Path) -> List[str]:
    """Return list of lines (preserve newline)."""
    try:
        return path.read_text(encoding="utf-8", errors="ignore").splitlines(keepends=True)
    except Exception:
        return []


def _chunk_lines(
    lines: List[str], chunk_size: int = CHUNK_SIZE_LINES, overlap: int = CHUNK_OVERLAP_LINES
) -> List[Tuple[int, int, str]]:
    """
    Yield (start_line_no, end_line_no, text) tuples.
    1‑based line numbers are used for UI friendliness.
    """
    n = len(lines)
    i = 0
    while i < n:
        start = i
        end = min(i + chunk_size, n)
        chunk = "".join(lines[start:end])
        yield (start + 1, end, chunk)  # +1 → human line numbers
        i = end - overlap  # step back a bit for context


def index_project(root_dir: Path, store: VectorStore):
    """
    Walk *root_dir*, split every file into chunks, embed each chunk
    and store them in the supplied VectorStore.
    """
    print(f"🚀 Starting indexing of {root_dir}")
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in filenames:
            # Skip binary / hidden files – simple heuristic
            if fn.startswith("."):
                continue
            file_path = Path(dirpath) / fn
            rel_path = file_path.relative_to(root_dir).as_posix()
            lines = _read_file(file_path)
            if not lines:
                continue

            # Build chunks
            chunk_infos = list(_chunk_lines(lines))
            texts = [c[2] for c in chunk_infos]

            # Batch embed (you could do smaller batches if memory is a concern)
            embeddings = [embed(t, EMBEDDING_MODEL) for t in tqdm(texts, desc=f"Embedding {rel_path}", leave=False)]

            # Build metadata for each chunk
            metas = [
                {
                    "file": rel_path,
                    "start_line": start,
                    "end_line": end,
                    "text": txt,
                }
                for (start, end, txt) in chunk_infos
            ]

            store.add(embeddings, metas)

    store.persist()
    print("✅ Indexing complete and persisted.")
