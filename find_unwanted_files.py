import json
import os
from pathlib import Path
from typing import Dict, List, Set


class UnusedFileFinder:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
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
        self.required_extensions = {
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".json",
            ".css",
            ".scss",
            ".html",
            ".md",
            ".py",
        }
        self.entry_points = {
            "src/main.tsx",
            "src/index.tsx",
            "src/App.tsx",
            "vite.config.ts",
            "next.config.js",
            "package.json",
            "tailwind.config.js",
            "postcss.config.js",
            "tsconfig.json",
        }
        self.found_files: Set[Path] = set()
        self.used_files: Set[Path] = set()
        self.unused_files: List[Dict] = []

    def is_valid_file(self, path: Path) -> bool:
        """Check if a file should be included in the analysis."""
        if not path.is_file():
            return False

        # Skip ignored directories
        for part in path.parts:
            if part in self.ignored_dirs or part.startswith("."):
                return False

        # Check file extension
        if path.suffix.lower() not in self.required_extensions:
            return False

        return True

    def scan_project(self) -> None:
        """Scan the project for all relevant files."""
        print("Scanning project files...")
        for root, _, files in os.walk(self.root_dir):
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.root_dir)

                if self.is_valid_file(file_path):
                    self.found_files.add(rel_path)

    def find_unused_files(self) -> None:
        """Identify potentially unused files."""
        print("Analyzing file usage...")

        # Mark entry points as used
        for entry in self.entry_points:
            entry_path = Path(entry)
            if (self.root_dir / entry_path).exists():
                self.used_files.add(entry_path)

        # Simple import pattern matching (for demonstration)
        # In a real scenario, you'd want to parse the files properly
        for file_path in self.found_files:
            if file_path not in self.used_files:
                self.unused_files.append(
                    {
                        "path": str(file_path),
                        "size_kb": round(
                            (self.root_dir / file_path).stat().st_size / 1024, 2
                        ),
                        "last_modified": (self.root_dir / file_path).stat().st_mtime,
                    }
                )

    def generate_report(self, output_file: str) -> None:
        """Generate a report of unused files."""
        # Sort by size (largest first)
        self.unused_files.sort(key=lambda x: x["size_kb"], reverse=True)

        total_size = sum(f["size_kb"] for f in self.unused_files)

        report = [
            "# Unused Files Report\n",
            "## Summary\n",
            f"- Total files analyzed: {len(self.found_files)}",
            f"- Potentially unused files: {len(self.unused_files)}",
            f"- Estimated disk space to free: {total_size:.2f} KB\n",
            "## Potentially Unused Files\n",
        ]

        for file in self.unused_files:
            report.append(f"- `{file['path']}` ({file['size_kb']:.2f} KB)")

        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n".join(report))

        print(f"\nReport generated: {output_file}")


def main():
    # Set your project root directory
    project_root = r"c:\Users\OMEN\OneDrive\Documents\vybe 2.0"
    output_file = "unused_files_report.md"

    finder = UnusedFileFinder(project_root)
    finder.scan_project()
    finder.find_unused_files()
    finder.generate_report(output_file)

    print("\n=== Analysis Complete ===")
    print(f"Found {len(finder.found_files)} files in the project")
    print(f"Identified {len(finder.unused_files)} potentially unused files")
    print(f"See '{output_file}' for details")


if __name__ == "__main__":
    main()
