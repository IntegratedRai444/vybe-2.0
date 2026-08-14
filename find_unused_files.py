import json
import os
import re
from pathlib import Path
from typing import Dict, List, Set


class UnusedFileFinder:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.src_dir = self.project_root / "frontend" / "src"
        self.ignored_dirs = {
            "node_modules",
            ".git",
            ".next",
            "dist",
            "build",
            "__pycache__",
            ".idea",
            ".vscode",
            "venv",
            ".venv",
            ".gitignore",
            ".eslintrc",
            ".prettierrc",
            ".env*",
            "*.log",
            "*.tmp",
            "*.bak",
            "*.swp",
            "*.swo",
        }
        self.used_files: Set[Path] = set()
        self.all_files: Set[Path] = set()
        self.import_pattern = re.compile(
            r"from\s+['\"]([^'\"]+)['\"]|import\s+.*\s+from\s+['\"]([^'\"]+)['\"]"
        )

    def is_ignored(self, path: Path) -> bool:
        """Check if a path should be ignored."""
        for part in path.parts:
            if part.startswith(".") and part not in [".", ".."]:
                return True
            if part in self.ignored_dirs:
                return True
            if part.endswith((".log", ".tmp", ".bak", ".swp", ".swo")):
                return True
        return False

    def find_all_files(self) -> None:
        """Find all relevant files in the project."""
        print("Scanning project files...")
        for root, _, files in os.walk(self.project_root):
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.project_root)

                if not self.is_ignored(file_path) and file_path.suffix in {
                    ".ts",
                    ".tsx",
                    ".js",
                    ".jsx",
                }:
                    self.all_files.add(rel_path)

    def analyze_imports(self) -> None:
        """Analyze imports in all TypeScript/JavaScript files."""
        print("Analyzing imports...")
        for file_path in list(self.all_files):
            try:
                content = (self.project_root / file_path).read_text(encoding="utf-8")
                matches = self.import_pattern.finditer(content)

                for match in matches:
                    # Get either the first or second group that matched
                    import_path = match.group(1) or match.group(2)
                    if not import_path:
                        continue

                    # Convert import path to actual file path
                    if import_path.startswith("@/"):
                        import_path = import_path[2:]
                    elif import_path.startswith("."):
                        import_path = str(file_path.parent / import_path)

                    # Try to find the actual file
                    self._resolve_import(import_path, file_path.parent)

            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")

    def _resolve_import(self, import_path: str, base_dir: Path) -> None:
        """Resolve an import path to an actual file."""
        # Try with .tsx, .ts, .js, .jsx extensions
        for ext in ["", ".tsx", ".ts", ".js", ".jsx"]:
            full_path = (self.project_root / base_dir / f"{import_path}{ext}").resolve()
            if full_path.exists():
                rel_path = full_path.relative_to(self.project_root)
                self.used_files.add(rel_path)
                return

    def find_unused_files(self) -> List[Dict]:
        """Find files that aren't imported anywhere."""
        unused = []
        for file_path in self.all_files:
            if file_path not in self.used_files and "test" not in str(file_path):
                unused.append(
                    {
                        "path": str(file_path),
                        "size_kb": (self.project_root / file_path).stat().st_size
                        / 1024,
                    }
                )
        return sorted(unused, key=lambda x: x["size_kb"], reverse=True)


def main():
    project_root = r"c:\Users\OMEN\OneDrive\Documents\vybe 2.0"
    output_file = "unused_files_analysis.md"

    finder = UnusedFileFinder(project_root)
    finder.find_all_files()
    finder.analyze_imports()
    unused_files = finder.find_unused_files()

    # Generate report
    total_size = sum(f["size_kb"] for f in unused_files)

    report = [
        "# Unused Files Analysis\n",
        "## Summary\n",
        f"- Total files analyzed: {len(finder.all_files)}",
        f"- Potentially unused files: {len(unused_files)}",
        f"- Estimated disk space to free: {total_size:.2f} KB\n",
        "## Potentially Unused Files\n",
    ]

    for file in unused_files:
        report.append(f"- `{file['path']}` ({file['size_kb']:.2f} KB)")

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print(f"\n=== Analysis Complete ===")
    print(f"Found {len(finder.all_files)} files in the project")
    print(f"Identified {len(unused_files)} potentially unused files")
    print(f"See '{output_file}' for details")


if __name__ == "__main__":
    main()
