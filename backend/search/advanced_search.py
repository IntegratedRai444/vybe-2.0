# backend/search/advanced_search.py
"""
Advanced Search and Replace System
Regex search across files, search history, replace preview
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Pattern
from dataclasses import dataclass, asdict
from datetime import datetime
import fnmatch

logger = logging.getLogger(__name__)

@dataclass
class SearchMatch:
    file_path: str
    line_number: int
    column_start: int
    column_end: int
    line_content: str
    match_text: str
    context_before: List[str] = None
    context_after: List[str] = None

@dataclass
class SearchResult:
    query: str
    pattern_type: str  # 'text', 'regex', 'word'
    case_sensitive: bool
    matches: List[SearchMatch]
    total_matches: int
    files_searched: int
    search_time: float
    timestamp: datetime

@dataclass
class ReplacePreview:
    original_match: SearchMatch
    replacement_text: str
    new_line_content: str

@dataclass
class SearchHistory:
    query: str
    pattern_type: str
    case_sensitive: bool
    include_patterns: List[str]
    exclude_patterns: List[str]
    timestamp: datetime
    result_count: int

class AdvancedSearchService:
    """Advanced search and replace service"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root).resolve()
        self.history_file = self.project_root / ".vybe" / "search_history.json"
        self.history_file.parent.mkdir(exist_ok=True)
        
        # Default file patterns
        self.default_include_patterns = [
            "*.py", "*.js", "*.ts", "*.tsx", "*.jsx", "*.html", "*.css", "*.scss",
            "*.json", "*.xml", "*.yaml", "*.yml", "*.md", "*.txt", "*.sql",
            "*.php", "*.java", "*.cpp", "*.c", "*.h", "*.hpp", "*.cs", "*.rb",
            "*.go", "*.rs", "*.swift", "*.kt", "*.scala", "*.sh", "*.bat"
        ]
        
        self.default_exclude_patterns = [
            "node_modules/*", "__pycache__/*", ".git/*", "dist/*", "build/*",
            ".next/*", ".vscode/*", "*.pyc", "*.pyo", "*.pyd", "*.so", "*.dll",
            "*.exe", "*.bin", "*.log", "*.tmp", "*.cache"
        ]
    
    def search_in_files(
        self,
        query: str,
        pattern_type: str = "text",
        case_sensitive: bool = False,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        max_results: int = 1000,
        context_lines: int = 2
    ) -> SearchResult:
        """Search for text in files"""
        start_time = datetime.now()
        
        # Use default patterns if not provided
        if include_patterns is None:
            include_patterns = self.default_include_patterns
        if exclude_patterns is None:
            exclude_patterns = self.default_exclude_patterns
        
        # Compile regex pattern
        try:
            if pattern_type == "regex":
                flags = 0 if case_sensitive else re.IGNORECASE
                pattern = re.compile(query, flags)
            elif pattern_type == "word":
                flags = 0 if case_sensitive else re.IGNORECASE
                escaped_query = re.escape(query)
                pattern = re.compile(rf'\b{escaped_query}\b', flags)
            else:  # text
                flags = 0 if case_sensitive else re.IGNORECASE
                escaped_query = re.escape(query)
                pattern = re.compile(escaped_query, flags)
        except re.error as e:
            logger.error(f"Invalid regex pattern: {e}")
            return SearchResult(
                query=query,
                pattern_type=pattern_type,
                case_sensitive=case_sensitive,
                matches=[],
                total_matches=0,
                files_searched=0,
                search_time=0.0,
                timestamp=start_time
            )
        
        matches = []
        files_searched = 0
        
        # Walk through project files
        for file_path in self._get_searchable_files(include_patterns, exclude_patterns):
            if len(matches) >= max_results:
                break
                
            try:
                file_matches = self._search_in_file(file_path, pattern, context_lines)
                matches.extend(file_matches)
                files_searched += 1
                
                if len(matches) >= max_results:
                    matches = matches[:max_results]
                    break
                    
            except Exception as e:
                logger.warning(f"Error searching in {file_path}: {e}")
                continue
        
        search_time = (datetime.now() - start_time).total_seconds()
        
        result = SearchResult(
            query=query,
            pattern_type=pattern_type,
            case_sensitive=case_sensitive,
            matches=matches,
            total_matches=len(matches),
            files_searched=files_searched,
            search_time=search_time,
            timestamp=start_time
        )
        
        # Save to history
        self._save_to_history(query, pattern_type, case_sensitive, include_patterns, exclude_patterns, len(matches))
        
        return result
    
    def _get_searchable_files(self, include_patterns: List[str], exclude_patterns: List[str]) -> List[Path]:
        """Get list of files to search based on patterns"""
        searchable_files = []
        
        for root, dirs, files in os.walk(self.project_root):
            # Filter directories
            dirs[:] = [d for d in dirs if not any(fnmatch.fnmatch(d, pattern.rstrip('/*')) for pattern in exclude_patterns)]
            
            for file in files:
                file_path = Path(root) / file
                relative_path = file_path.relative_to(self.project_root)
                
                # Check exclude patterns
                if any(fnmatch.fnmatch(str(relative_path), pattern) for pattern in exclude_patterns):
                    continue
                
                # Check include patterns
                if any(fnmatch.fnmatch(file, pattern) for pattern in include_patterns):
                    searchable_files.append(file_path)
        
        return searchable_files
    
    def _search_in_file(self, file_path: Path, pattern: Pattern, context_lines: int) -> List[SearchMatch]:
        """Search for pattern in a single file"""
        matches = []
        
        try:
            # Try to read as text file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            relative_path = str(file_path.relative_to(self.project_root))
            
            for line_num, line in enumerate(lines, 1):
                for match in pattern.finditer(line):
                    # Get context lines
                    context_before = []
                    context_after = []
                    
                    if context_lines > 0:
                        start_idx = max(0, line_num - context_lines - 1)
                        end_idx = min(len(lines), line_num + context_lines)
                        
                        context_before = [l.rstrip('\n\r') for l in lines[start_idx:line_num-1]]
                        context_after = [l.rstrip('\n\r') for l in lines[line_num:end_idx]]
                    
                    search_match = SearchMatch(
                        file_path=relative_path,
                        line_number=line_num,
                        column_start=match.start(),
                        column_end=match.end(),
                        line_content=line.rstrip('\n\r'),
                        match_text=match.group(),
                        context_before=context_before,
                        context_after=context_after
                    )
                    matches.append(search_match)
        
        except (UnicodeDecodeError, PermissionError):
            # Skip binary files or files we can't read
            pass
        except Exception as e:
            logger.warning(f"Error reading {file_path}: {e}")
        
        return matches
    
    def get_replace_preview(
        self,
        search_result: SearchResult,
        replacement: str,
        max_previews: int = 100
    ) -> List[ReplacePreview]:
        """Get preview of replacements"""
        previews = []
        
        for match in search_result.matches[:max_previews]:
            try:
                # Create replacement text
                if search_result.pattern_type == "regex":
                    # For regex, we need to re-match to get groups
                    flags = 0 if search_result.case_sensitive else re.IGNORECASE
                    pattern = re.compile(search_result.query, flags)
                    
                    # Re-match the line to get proper groups
                    line_match = pattern.search(match.line_content)
                    if line_match:
                        replacement_text = line_match.expand(replacement)
                    else:
                        replacement_text = replacement
                else:
                    replacement_text = replacement
                
                # Create new line content
                new_line = (
                    match.line_content[:match.column_start] +
                    replacement_text +
                    match.line_content[match.column_end:]
                )
                
                preview = ReplacePreview(
                    original_match=match,
                    replacement_text=replacement_text,
                    new_line_content=new_line
                )
                previews.append(preview)
                
            except Exception as e:
                logger.warning(f"Error creating replacement preview: {e}")
                continue
        
        return previews
    
    def execute_replace(
        self,
        search_result: SearchResult,
        replacement: str,
        selected_matches: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Execute replacements"""
        if selected_matches is None:
            # Replace all matches
            matches_to_replace = search_result.matches
        else:
            # Replace only selected matches
            matches_to_replace = [search_result.matches[i] for i in selected_matches if i < len(search_result.matches)]
        
        # Group matches by file
        files_to_modify = {}
        for match in matches_to_replace:
            if match.file_path not in files_to_modify:
                files_to_modify[match.file_path] = []
            files_to_modify[match.file_path].append(match)
        
        # Sort matches by line number (descending) to avoid offset issues
        for file_path in files_to_modify:
            files_to_modify[file_path].sort(key=lambda m: m.line_number, reverse=True)
        
        results = {
            "files_modified": 0,
            "replacements_made": 0,
            "errors": []
        }
        
        # Process each file
        for file_path, file_matches in files_to_modify.items():
            try:
                full_path = self.project_root / file_path
                
                # Read file
                with open(full_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Apply replacements (in reverse order)
                for match in file_matches:
                    line_idx = match.line_number - 1
                    if line_idx < len(lines):
                        line = lines[line_idx]
                        
                        # Create replacement
                        if search_result.pattern_type == "regex":
                            flags = 0 if search_result.case_sensitive else re.IGNORECASE
                            pattern = re.compile(search_result.query, flags)
                            new_line = pattern.sub(replacement, line, count=1)
                        else:
                            # Simple text replacement
                            if search_result.case_sensitive:
                                new_line = line.replace(match.match_text, replacement, 1)
                            else:
                                # Case-insensitive replacement
                                new_line = re.sub(
                                    re.escape(match.match_text),
                                    replacement,
                                    line,
                                    count=1,
                                    flags=re.IGNORECASE
                                )
                        
                        lines[line_idx] = new_line
                        results["replacements_made"] += 1
                
                # Write file back
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                
                results["files_modified"] += 1
                
            except Exception as e:
                error_msg = f"Error modifying {file_path}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
        
        return results
    
    def get_search_history(self, limit: int = 50) -> List[SearchHistory]:
        """Get search history"""
        try:
            if not self.history_file.exists():
                return []
            
            with open(self.history_file, 'r', encoding='utf-8') as f:
                history_data = json.load(f)
            
            history = []
            for item in history_data[-limit:]:  # Get most recent
                history_item = SearchHistory(
                    query=item["query"],
                    pattern_type=item["pattern_type"],
                    case_sensitive=item["case_sensitive"],
                    include_patterns=item["include_patterns"],
                    exclude_patterns=item["exclude_patterns"],
                    timestamp=datetime.fromisoformat(item["timestamp"]),
                    result_count=item["result_count"]
                )
                history.append(history_item)
            
            return list(reversed(history))  # Most recent first
            
        except Exception as e:
            logger.error(f"Error loading search history: {e}")
            return []
    
    def _save_to_history(
        self,
        query: str,
        pattern_type: str,
        case_sensitive: bool,
        include_patterns: List[str],
        exclude_patterns: List[str],
        result_count: int
    ):
        """Save search to history"""
        try:
            # Load existing history
            history_data = []
            if self.history_file.exists():
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    history_data = json.load(f)
            
            # Add new entry
            new_entry = {
                "query": query,
                "pattern_type": pattern_type,
                "case_sensitive": case_sensitive,
                "include_patterns": include_patterns,
                "exclude_patterns": exclude_patterns,
                "timestamp": datetime.now().isoformat(),
                "result_count": result_count
            }
            
            # Remove duplicate queries (keep most recent)
            history_data = [item for item in history_data if item["query"] != query]
            history_data.append(new_entry)
            
            # Keep only last 100 entries
            if len(history_data) > 100:
                history_data = history_data[-100:]
            
            # Save back
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(history_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving search history: {e}")
    
    def clear_search_history(self):
        """Clear search history"""
        try:
            if self.history_file.exists():
                self.history_file.unlink()
        except Exception as e:
            logger.error(f"Error clearing search history: {e}")
    
    def export_search_results(self, search_result: SearchResult, format: str = "json") -> str:
        """Export search results to various formats"""
        try:
            if format == "json":
                return json.dumps(asdict(search_result), indent=2, default=str)
            
            elif format == "csv":
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Header
                writer.writerow(["File", "Line", "Column", "Match", "Content"])
                
                # Data
                for match in search_result.matches:
                    writer.writerow([
                        match.file_path,
                        match.line_number,
                        match.column_start,
                        match.match_text,
                        match.line_content
                    ])
                
                return output.getvalue()
            
            elif format == "text":
                lines = [
                    f"Search Results for: {search_result.query}",
                    f"Pattern Type: {search_result.pattern_type}",
                    f"Case Sensitive: {search_result.case_sensitive}",
                    f"Total Matches: {search_result.total_matches}",
                    f"Files Searched: {search_result.files_searched}",
                    f"Search Time: {search_result.search_time:.3f}s",
                    "",
                    "Matches:",
                    ""
                ]
                
                for match in search_result.matches:
                    lines.append(f"{match.file_path}:{match.line_number}:{match.column_start}")
                    lines.append(f"  {match.line_content}")
                    lines.append("")
                
                return "\n".join(lines)
            
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Error exporting search results: {e}")
            return f"Error exporting: {str(e)}"

# Global service instances (per project)
_search_services = {}

def get_search_service(project_root: str) -> AdvancedSearchService:
    """Get search service for a project"""
    if project_root not in _search_services:
        _search_services[project_root] = AdvancedSearchService(project_root)
    return _search_services[project_root]