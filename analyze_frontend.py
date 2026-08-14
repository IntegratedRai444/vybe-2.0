import os
import re
from pathlib import Path
from typing import Dict, List, Tuple


class FrontendAnalyzer:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.ignored_dirs = {
            "node_modules",
            ".git",
            ".next",
            "dist",
            "build",
            "__pycache__",
        }
        self.file_types = {
            "component": [".tsx", ".jsx"],
            "style": [".css", ".scss", ".sass", ".less", ".module.css"],
            "test": [".test.", ".spec."],
            "config": [".json", ".config.", "webpack", "babel", "eslint", "prettier"],
            "documentation": [".md", ".mdx", ".txt"],
            "types": [".d.ts", "types/"],
            "assets": [".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico"],
            "utils": ["utils/", "helpers/"],
            "hooks": ["hooks/"],
            "context": ["context/", "store/"],
            "api": ["api/", "services/"],
            "pages": ["pages/", "routes/", "views/"],
        }

    def analyze_file(self, file_path: Path) -> Dict[str, str]:
        """Analyze a single file and determine its purpose."""
        rel_path = str(file_path.relative_to(self.root_dir)).replace("\\", "/")
        file_info = {
            "path": rel_path,
            "type": "unknown",
            "purpose": "Unknown",
            "size_kb": round(file_path.stat().st_size / 1024, 2),
        }

        # Check file type and purpose
        for purpose, patterns in self.file_types.items():
            if any(p in str(file_path).lower() for p in patterns):
                file_info["type"] = purpose
                file_info["purpose"] = self._get_purpose_description(purpose)
                break

        # Special handling for components
        if file_path.suffix in [".tsx", ".jsx"]:
            if (
                "component" in str(file_path.parent).lower()
                or file_path.stem[0].isupper()
            ):
                file_info["type"] = "component"
                file_info["purpose"] = "UI Component"

        return file_info

    def _get_purpose_description(self, purpose: str) -> str:
        """Get a human-readable description for a file purpose."""
        descriptions = {
            "component": "UI Component",
            "style": "Styling",
            "test": "Test File",
            "config": "Configuration",
            "documentation": "Documentation",
            "types": "Type Definitions",
            "assets": "Static Assets",
            "utils": "Utility Functions",
            "hooks": "React Hooks",
            "context": "State Management",
            "api": "API/Service Layer",
            "pages": "Page/Routing Component",
        }
        return descriptions.get(purpose, "Unknown")


def generate_report(analysis: List[Dict], output_file: str):
    """Generate a markdown report from the analysis."""
    report = ["# Frontend Codebase Analysis\n"]

    # Group by file type
    by_type = {}
    for item in analysis:
        by_type.setdefault(item["type"], []).append(item)

    # Summary
    report.append("## Summary\n")
    for file_type, files in sorted(by_type.items()):
        report.append(f"- **{file_type.title()}**: {len(files)} files")

    # Details by type
    for file_type, files in sorted(by_type.items()):
        report.append(f"\n## {file_type.title()} ({len(files)} files)\n")
        for file in files:
            report.append(
                f"- `{file['path']}` ({file['size_kb']} KB) - {file['purpose']}"
            )

    # Write to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print(f"Report generated: {output_file}")


def main():
    # Set your frontend directory path here
    frontend_dir = r"c:\Users\OMEN\OneDrive\Documents\vybe 2.0\frontend"
    output_file = "frontend_analysis.md"

    analyzer = FrontendAnalyzer(frontend_dir)
    analysis = []

    # Walk through the directory
    for root, dirs, files in os.walk(frontend_dir, topdown=True):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in analyzer.ignored_dirs]

        for file in files:
            file_path = Path(root) / file
            if file_path.suffix not in [".py", ".pyc"]:  # Skip Python files
                analysis.append(analyzer.analyze_file(file_path))

    # Generate report
    generate_report(analysis, output_file)


if __name__ == "__main__":
    main()
