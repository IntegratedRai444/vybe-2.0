"""
Patch Executor
Safely applies code fixes to files
"""
import os
import shutil
import difflib
from typing import List, Dict, Optional
from datetime import datetime
import logging

from .models import IssueFix, CodeIssue

logger = logging.getLogger(__name__)

class PatchExecutor:
    """Executes code patches safely"""
    
    def __init__(self, backup_dir: Optional[str] = None):
        """Initialize patch executor"""
        self.backup_dir = backup_dir or ".mcp_backups"
        
    def apply_fixes(
        self,
        fixes: List[IssueFix],
        dry_run: bool = True,
        auto_backup: bool = True
    ) -> Dict:
        """Apply multiple fixes"""
        results = {
            "applied": [],
            "failed": [],
            "skipped": [],
            "backups": []
        }
        
        # Group fixes by file
        fixes_by_file = self._group_by_file(fixes)
        
        for file_path, file_fixes in fixes_by_file.items():
            try:
                # Backup file if needed
                if auto_backup and not dry_run:
                    backup_path = self._backup_file(file_path)
                    results["backups"].append(backup_path)
                
                # Apply fixes to this file
                success = self._apply_file_fixes(file_path, file_fixes, dry_run)
                
                if success:
                    results["applied"].extend(file_fixes)
                else:
                    results["failed"].extend(file_fixes)
                    
            except Exception as e:
                logger.error(f"Failed to apply fixes to {file_path}: {e}")
                results["failed"].extend(file_fixes)
        
        return results
    
    def apply_single_fix(
        self,
        fix: IssueFix,
        dry_run: bool = True,
        auto_backup: bool = True
    ) -> bool:
        """Apply a single fix"""
        try:
            file_path = fix.issue.file_path
            
            # Backup if needed
            if auto_backup and not dry_run:
                self._backup_file(file_path)
            
            # Apply fix
            return self._apply_file_fixes(file_path, [fix], dry_run)
            
        except Exception as e:
            logger.error(f"Failed to apply fix: {e}")
            return False
    
    def _group_by_file(self, fixes: List[IssueFix]) -> Dict[str, List[IssueFix]]:
        """Group fixes by file path"""
        grouped = {}
        for fix in fixes:
            file_path = fix.issue.file_path
            if file_path not in grouped:
                grouped[file_path] = []
            grouped[file_path].append(fix)
        return grouped
    
    def _apply_file_fixes(
        self,
        file_path: str,
        fixes: List[IssueFix],
        dry_run: bool
    ) -> bool:
        """Apply fixes to a single file"""
        try:
            # Read current file
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Sort fixes by line number (reverse order to avoid offset issues)
            fixes.sort(key=lambda f: f.issue.line_number, reverse=True)
            
            # Apply each fix
            modified_lines = lines.copy()
            for fix in fixes:
                modified_lines = self._apply_fix_to_lines(
                    modified_lines,
                    fix
                )
            
            # Show diff
            self._show_diff(file_path, lines, modified_lines)
            
            # Write back if not dry run
            if not dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(modified_lines)
                logger.info(f"Applied {len(fixes)} fixes to {file_path}")
            else:
                logger.info(f"[DRY RUN] Would apply {len(fixes)} fixes to {file_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to apply fixes to {file_path}: {e}")
            return False
    
    def _apply_fix_to_lines(
        self,
        lines: List[str],
        fix: IssueFix
    ) -> List[str]:
        """Apply a single fix to lines"""
        line_num = fix.issue.line_number - 1  # Convert to 0-indexed
        
        if line_num < 0 or line_num >= len(lines):
            logger.warning(f"Invalid line number: {fix.issue.line_number}")
            return lines
        
        # Extract fix code (remove markdown code blocks if present)
        fix_code = fix.fix_code
        if "```" in fix_code:
            # Extract code from markdown
            parts = fix_code.split("```")
            for part in parts:
                if part.strip() and not part.strip().startswith(("python", "javascript", "typescript")):
                    fix_code = part.strip()
                    break
        
        # Simple line replacement
        # TODO: Implement more sophisticated patching (multi-line, context matching)
        new_lines = lines.copy()
        
        # Try to preserve indentation
        original_line = lines[line_num]
        indent = len(original_line) - len(original_line.lstrip())
        
        # Apply indentation to fix
        fix_lines = fix_code.split("\n")
        indented_fix = "\n".join(" " * indent + line if line.strip() else line for line in fix_lines)
        
        # Replace line
        new_lines[line_num] = indented_fix + "\n"
        
        return new_lines
    
    def _backup_file(self, file_path: str) -> str:
        """Create backup of file"""
        # Create backup directory
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(file_path)
        backup_name = f"{filename}.{timestamp}.backup"
        backup_path = os.path.join(self.backup_dir, backup_name)
        
        # Copy file
        shutil.copy2(file_path, backup_path)
        logger.info(f"Backed up {file_path} to {backup_path}")
        
        return backup_path
    
    def _show_diff(self, file_path: str, old_lines: List[str], new_lines: List[str]):
        """Show diff between old and new"""
        diff = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=f"{file_path} (original)",
            tofile=f"{file_path} (fixed)",
            lineterm=""
        )
        
        diff_text = "\n".join(diff)
        if diff_text:
            logger.info(f"\nDiff for {file_path}:\n{diff_text}\n")
    
    def restore_backup(self, backup_path: str, target_path: str) -> bool:
        """Restore file from backup"""
        try:
            shutil.copy2(backup_path, target_path)
            logger.info(f"Restored {target_path} from {backup_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to restore backup: {e}")
            return False