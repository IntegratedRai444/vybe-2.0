# ui.py
import os
import json
from pathlib import Path
import gradio as gr
from orchestrator import handle_request
from indexer import index_project
from config import GRADIO_PORT, FASTAPI_PORT, INDEX_DIR

# ----------------------------------------------------------------------
# Helper: build a tiny JSON representation of a folder tree
# ----------------------------------------------------------------------
def build_tree(root: Path) -> dict:
    """Return a nested dict: {'name': ..., 'children': [...], 'is_file': bool}"""
    def _recurse(p: Path):
        if p.is_dir():
            return {
                "name": p.name,
                "is_file": False,
                "children": [_recurse(c) for c in sorted(p.iterdir()) if not c.name.startswith('.')],
                "path": str(p.relative_to(root))
            }
        else:
            return {"name": p.name, "is_file": True, "path": str(p.relative_to(root))}
    return _recurse(root)


def tree_to_dropdown(tree: dict, prefix: str = "") -> list[tuple]:
    """Flatten tree for use as a Gradio Dropdown (value, label)."""
    out = []
    base = f"{prefix}/{tree['name']}" if prefix else tree['name']
    if tree["is_file"]:
        out.append((base, base))
    else:
        out.append((base, f"[Folder] {tree['name']}"))
        for child in tree.get("children", []):
            out.extend(tree_to_dropdown(child, base))
    return out


# ----------------------------------------------------------------------
# UI callbacks
# ----------------------------------------------------------------------
def load_project_folder(folder_path: str):
    """User clicks “Load Project”. Indexes (or re‑indexes) the folder."""
    root = Path(folder_path).expanduser().resolve()
    if not root.is_dir():
        return gr.update(value="❌ Folder not found"), None

    # (re)‑index – this can take a while for big projects; you could add async later.
    index_project(root, VECTOR_STORE)

    # Build tree for file selector
    tree = build_tree(root)
    dropdown_choices = tree_to_dropdown(tree)
    return (
        f"✅ Indexed {len(VECTOR_STORE.metadata)} chunks.",
        gr.Dropdown(choices=dropdown_choices, label="Select file", value=dropdown_choices[0][0]),
    )


def load_file(selected_path: str, project_root: str):
    """Read file content when a file is selected."""
    file_abs = Path(project_root) / selected_path
    try:
        txt = file_abs.read_text(encoding="utf-8")
    except Exception as e:
        txt = f"// ❌ Could not read file: {e}"
    return txt


def generate_completion(
    user_prompt: str,
    file_path: str,
    code: str,
    model_name: str,
    project_root: str,
):
    """Called when the user hits “Run”. Returns the generated snippet."""
    if not user_prompt.strip():
        return "⚠️ Prompt is empty."

    # Forward to orchestrator (the heavy lifting)
    result = handle_request(
        user_prompt=user_prompt,
        file_path=file_path,
        model_override=model_name,
        top_k=5,
    )
    return result


# ----------------------------------------------------------------------
# Build the Gradio Interface
# ----------------------------------------------------------------------
with gr.Blocks(theme=gr.themes.Default()) as demo:
    gr.Markdown("# 🖥️ Offline AI IDE – Gradio Front‑end")

    # ------------------------------------------------------------------
    # 1️⃣ Project loader
    # ------------------------------------------------------------------
    with gr.Row():
        project_folder = gr.Textbox(
            label="Project folder (absolute or relative)",
            placeholder="/home/me/my‑project",
        )
        load_btn = gr.Button("🚀 Index / Load")
        load_msg = gr.Textbox(label="Status", interactive=False)

    # ------------------------------------------------------------------
    # 2️⃣ File selector + editor
    # ------------------------------------------------------------------
    file_dropdown = gr.Dropdown(
        choices=[],
        label="File (select after project is loaded)",
        interactive=True,
    )
    code_editor = gr.Code(
        language="python",
        label="File contents (editable)",
        lines=30,
        interactive=True,
    )

    # ------------------------------------------------------------------
    # 3️⃣ Prompt + Model selector
    # ------------------------------------------------------------------
    with gr.Row():
        user_prompt = gr.Textbox(
            label="🗣️ Prompt (what do you want the AI to do?)",
            placeholder="Write a unit test for the function `foo` ...",
            lines=4,
        )
        model_selector = gr.Dropdown(
            choices=[
                "",  # empty = let orchestrator auto‑pick
                "codellama:7b-instruct",
                "llama3:latest",
                "llama2:latest",
            ],
            label="Model override (optional)",
            value="",
        )
    run_btn = gr.Button("▶️ Run")
    output_box = gr.Code(label="🖋️ Generated code / answer", language="text", lines=15)

    # ------------------------------------------------------------------
    # Wire callbacks
    # ------------------------------------------------------------------
    # 1️⃣ Indexing
    load_btn.click(
        fn=load_project_folder,
        inputs=[project_folder],
        outputs=[load_msg, file_dropdown],
    )

    # 2️⃣ Load file content when a file is chosen
    file_dropdown.change(
        fn=load_file,
        inputs=[file_dropdown, project_folder],
        outputs=code_editor,
    )

    # 3️⃣ Generate completion
    run_btn.click(
        fn=generate_completion,
        inputs=[user_prompt, file_dropdown, code_editor, model_selector, project_folder],
        outputs=output_box,
    )

# ----------------------------------------------------------------------
# Run both FastAPI (backend) and Gradio (frontend) in the same process
# ----------------------------------------------------------------------
if __name__ == "__main__":
    # 1️⃣ FastAPI – we expose a tiny health endpoint (useful for external tools)
    from fastapi import FastAPI

    fastapi_app = FastAPI()


    @fastapi_app.get("/health")
    async def health():
        return {"status": "ok"}

    # 2️⃣ Run both servers concurrently
    import threading
    import uvicorn

    def run_fastapi():
        uvicorn.run(fastapi_app, host="0.0.0.0", port=FASTAPI_PORT, log_level="error")

    threading.Thread(target=run_fastapi, daemon=True).start()
    demo.queue().launch(server_name="0.0.0.0", server_port=GRADIO_PORT, debug=True)
