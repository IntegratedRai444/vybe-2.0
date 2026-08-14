import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set


class ImportAnalyzer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.src_dir = self.project_root / "frontend" / "src"
        self.import_pattern = re.compile(
            r"from\s+['\"]([^'\"]+)['\"]|import\s+.*\s+from\s+['\"]([^'\"]+)['\"]"
        )
        self.imports: Dict[Path, Set[str]] = defaultdict(set)
        self.used_files: Set[Path] = set()
        self.all_files: Set[Path] = set()

    def find_tsx_ts_files(self) -> None:
        """Find all TypeScript and TypeScript React files."""
        for root, _, files in os.walk(self.src_dir):
            for file in files:
                if file.endswith((".tsx", ".ts")):
                    self.all_files.add(Path(root) / file)

    def analyze_imports(self) -> None:
        """Analyze imports in all TypeScript/TypeScript React files."""
        for file_path in self.all_files:
            try:
                content = file_path.read_text(encoding="utf-8")
                matches = self.import_pattern.finditer(content)

                for match in matches:
                    import_path = match.group(1) or match.group(2)
                    if import_path and not import_path.startswith(("http", "//")):
                        self.imports[file_path].add(import_path)
            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")

    def resolve_imports(self) -> None:
        """Resolve import paths to actual files."""
        for file_path, imports in self.imports.items():
            for imp in imports:
                # Handle relative imports
                if imp.startswith("."):
                    abs_path = (file_path.parent / imp).resolve()
                    # Try with and without extensions
                    for ext in ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]:
                        if (abs_path.parent / f"{abs_path.name}{ext}").exists():
                            self.used_files.add(
                                abs_path.parent / f"{abs_path.name}{ext}"
                            )
                            break
                # Handle absolute imports (from src)
                elif imp.startswith("@/"):
                    rel_path = imp[2:]  # Remove @/ prefix
                    abs_path = (self.src_dir / rel_path).resolve()
                    for ext in ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]:
                        if (abs_path.parent / f"{abs_path.name}{ext}").exists():
                            self.used_files.add(
                                abs_path.parent / f"{abs_path.name}{ext}"
                            )
                            break

    def find_unused_files(self) -> List[Path]:
        """Find files that aren't imported anywhere."""
        # Always include entry points
        entry_points = [
            self.src_dir / "main.tsx",
            self.src_dir / "index.tsx",
            self.src_dir / "App.tsx",
            self.src_dir / "index.html",
            self.src_dir / "vite.config.ts",
        ]

        # Mark entry points as used
        for ep in entry_points:
            if ep.exists():
                self.used_files.add(ep)

        # Find unused files
        return [f for f in self.all_files if f not in self.used_files]

    def generate_report(self, output_file: str) -> None:
        """Generate a report of file usage."""
        unused_files = self.find_unused_files()

        report = [
            "# Frontend File Usage Analysis\n",
            "## Summary\n",
            f"- Total files analyzed: {len(self.all_files)}",
            f"- Files being used: {len(self.used_files)}",
            f"- Potentially unused files: {len(unused_files)}\n",
            "## Potentially Unused Files\n",
        ]

        for file in sorted(unused_files):
            report.append(f"- `{file.relative_to(self.project_root)}`")

        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n".join(report))


def main():
    project_root = r"c:\Users\OMEN\OneDrive\Documents\vybe 2.0"
    output_file = "frontend_usage_report.md"

    analyzer = ImportAnalyzer(project_root)
    print("Finding TypeScript/TSX files...")
    analyzer.find_tsx_ts_files()

    print("Analyzing imports...")
    analyzer.analyze_imports()

    print("Resolving import paths...")
    analyzer.resolve_imports()

    print("Generating report...")
    analyzer.generate_report(output_file)

    print(f"\n=== Analysis Complete ===")
    print(f"Found {len(analyzer.all_files)} TypeScript/TSX files")
    print(f"Identified {len(analyzer.used_files)} used files")
    print(f"Found {len(analyzer.find_unused_files())} potentially unused files")
    print(f"See '{output_file}' for details")


if __name__ == "__main__":
    main()
