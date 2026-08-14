# backend/settings_service.py
"""
Settings and configuration management service
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class SettingsService:
    """Manages IDE settings and configuration"""

    def __init__(self):
        self.settings_dir = Path.home() / ".vybe-ide"
        self.settings_file = self.settings_dir / "settings.json"
        self.workspace_settings_file = "vybe-workspace.json"

        # Ensure settings directory exists
        self.settings_dir.mkdir(exist_ok=True)

        # Default settings
        self.default_settings = {
            "editor": {
                "fontSize": 14,
                "fontFamily": "JetBrains Mono, Consolas, Monaco, monospace",
                "tabSize": 4,
                "insertSpaces": True,
                "wordWrap": "on",
                "lineNumbers": "on",
                "minimap": True,
                "autoSave": "afterDelay",
                "autoSaveDelay": 1000,
                "formatOnSave": True,
                "formatOnPaste": True,
            },
            "theme": {
                "colorTheme": "dark",
                "iconTheme": "vs-seti",
                "autoDetectColorScheme": True,
            },
            "terminal": {
                "shell": "auto",
                "fontSize": 12,
                "fontFamily": "JetBrains Mono, Consolas, Monaco, monospace",
                "cursorStyle": "block",
                "cursorBlinking": True,
            },
            "ai": {
                "primaryProvider": "ollama",
                "autoComplete": True,
                "contextLines": 50,
                "temperature": 0.7,
                "maxTokens": 1000,
            },
            "git": {
                "autoFetch": True,
                "autoStage": False,
                "confirmSync": True,
                "showInlineBlame": False,
            },
            "files": {
                "autoReveal": True,
                "exclude": [
                    "**/.git",
                    "**/.svn",
                    "**/.hg",
                    "**/CVS",
                    "**/.DS_Store",
                    "**/node_modules",
                    "**/__pycache__",
                    "**/*.pyc",
                ],
                "watcherExclude": [
                    "**/.git/objects/**",
                    "**/.git/subtree-cache/**",
                    "**/node_modules/**",
                    "**/__pycache__/**",
                ],
            },
            "search": {
                "exclude": [
                    "**/node_modules",
                    "**/bower_components",
                    "**/*.code-search",
                    "**/.git",
                    "**/__pycache__",
                ],
                "useRipgrep": True,
                "followSymlinks": True,
                "smartCase": True,
            },
            "debug": {
                "openDebugConsole": "internalConsole",
                "inlineValues": True,
                "showInlineBreakpointCandidates": True,
                "toolBarLocation": "docked",
            },
            "extensions": {
                "autoUpdate": True,
                "autoCheckUpdates": True,
                "ignoreRecommendations": False,
            },
            "workbench": {
                "startupEditor": "welcomePage",
                "enableExperiments": False,
                "colorCustomizations": {},
                "iconTheme": "vs-seti",
            },
            "security": {
                "workspace": {
                    "trust": {
                        "enabled": True,
                        "startupPrompt": "once",
                        "untrustedFiles": "prompt",
                    }
                }
            },
        }

        # Load settings on initialization
        self.user_settings = self.load_user_settings()

    def load_user_settings(self) -> Dict[str, Any]:
        """Load user settings from file"""
        try:
            if self.settings_file.exists():
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading user settings: {e}")
            return {}

    def save_user_settings(self, settings: Dict[str, Any]) -> bool:
        """Save user settings to file"""
        try:
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump(settings, f, indent=2)
            self.user_settings = settings
            return True
        except Exception as e:
            logger.error(f"Error saving user settings: {e}")
            return False

    def load_workspace_settings(self, workspace_path: str) -> Dict[str, Any]:
        """Load workspace-specific settings"""
        try:
            workspace_settings_path = (
                Path(workspace_path) / self.workspace_settings_file
            )
            if workspace_settings_path.exists():
                with open(workspace_settings_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading workspace settings: {e}")
            return {}

    def save_workspace_settings(
        self, workspace_path: str, settings: Dict[str, Any]
    ) -> bool:
        """Save workspace-specific settings"""
        try:
            workspace_settings_path = (
                Path(workspace_path) / self.workspace_settings_file
            )
            with open(workspace_settings_path, "w", encoding="utf-8") as f:
                json.dump(settings, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving workspace settings: {e}")
            return False

    def get_settings(self, workspace_path: Optional[str] = None) -> Dict[str, Any]:
        """Get merged settings (default + user + workspace)"""
        try:
            # Start with default settings
            merged_settings = self.default_settings.copy()

            # Merge user settings
            self._deep_merge(merged_settings, self.user_settings)

            # Merge workspace settings if provided
            if workspace_path:
                workspace_settings = self.load_workspace_settings(workspace_path)
                self._deep_merge(merged_settings, workspace_settings)

            return merged_settings

        except Exception as e:
            logger.error(f"Error getting settings: {e}")
            return self.default_settings.copy()

    def update_user_setting(self, key_path: str, value: Any) -> bool:
        """Update a specific user setting"""
        try:
            keys = key_path.split(".")
            current = self.user_settings

            # Navigate to the parent of the target key
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]

            # Set the value
            current[keys[-1]] = value

            # Save settings
            return self.save_user_settings(self.user_settings)

        except Exception as e:
            logger.error(f"Error updating user setting {key_path}: {e}")
            return False

    def update_workspace_setting(
        self, workspace_path: str, key_path: str, value: Any
    ) -> bool:
        """Update a specific workspace setting"""
        try:
            workspace_settings = self.load_workspace_settings(workspace_path)

            keys = key_path.split(".")
            current = workspace_settings

            # Navigate to the parent of the target key
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]

            # Set the value
            current[keys[-1]] = value

            # Save settings
            return self.save_workspace_settings(workspace_path, workspace_settings)

        except Exception as e:
            logger.error(f"Error updating workspace setting {key_path}: {e}")
            return False

    def get_setting(self, key_path: str, workspace_path: Optional[str] = None) -> Any:
        """Get a specific setting value"""
        try:
            settings = self.get_settings(workspace_path)
            keys = key_path.split(".")
            current = settings

            for key in keys:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None

            return current

        except Exception as e:
            logger.error(f"Error getting setting {key_path}: {e}")
            return None

    def reset_settings(self, scope: str = "user") -> bool:
        """Reset settings to defaults"""
        try:
            if scope == "user":
                return self.save_user_settings({})
            elif scope == "default":
                self.user_settings = {}
                return self.save_user_settings({})
            return False
        except Exception as e:
            logger.error(f"Error resetting settings: {e}")
            return False

    def export_settings(self, workspace_path: Optional[str] = None) -> Dict[str, Any]:
        """Export current settings"""
        return self.get_settings(workspace_path)

    def import_settings(self, settings: Dict[str, Any], scope: str = "user") -> bool:
        """Import settings"""
        try:
            if scope == "user":
                return self.save_user_settings(settings)
            return False
        except Exception as e:
            logger.error(f"Error importing settings: {e}")
            return False

    def _deep_merge(self, target: Dict[str, Any], source: Dict[str, Any]):
        """Deep merge source dict into target dict"""
        for key, value in source.items():
            if (
                key in target
                and isinstance(target[key], dict)
                and isinstance(value, dict)
            ):
                self._deep_merge(target[key], value)
            else:
                target[key] = value

    def get_keybindings(self) -> Dict[str, str]:
        """Get keyboard shortcuts"""
        return {
            "editor.action.formatDocument": "Shift+Alt+F",
            "workbench.action.quickOpen": "Ctrl+P",
            "workbench.action.findInFiles": "Ctrl+Shift+F",
            "workbench.action.showCommands": "Ctrl+Shift+P",
            "workbench.action.terminal.new": "Ctrl+Shift+`",
            "editor.action.commentLine": "Ctrl+/",
            "editor.action.duplicateSelection": "Shift+Alt+Down",
            "editor.action.moveLinesDownAction": "Alt+Down",
            "editor.action.moveLinesUpAction": "Alt+Up",
            "workbench.action.files.save": "Ctrl+S",
            "workbench.action.files.saveAll": "Ctrl+K S",
            "workbench.action.closeActiveEditor": "Ctrl+W",
            "workbench.action.reopenClosedEditor": "Ctrl+Shift+T",
            "workbench.action.toggleSidebarVisibility": "Ctrl+B",
            "workbench.action.togglePanel": "Ctrl+J",
            "workbench.action.zoomIn": "Ctrl+=",
            "workbench.action.zoomOut": "Ctrl+-",
            "workbench.action.zoomReset": "Ctrl+0",
        }

    def update_keybinding(self, command: str, keybinding: str) -> bool:
        """Update a keyboard shortcut"""
        try:
            keybindings = self.get_setting("keybindings") or {}
            keybindings[command] = keybinding
            return self.update_user_setting("keybindings", keybindings)
        except Exception as e:
            logger.error(f"Error updating keybinding: {e}")
            return False


# Global settings service instance
settings_service = SettingsService()
