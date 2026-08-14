// src/components/ThemeCustomizer.tsx
import React, { useState, useEffect } from "react";
import {
  FaPalette,
  FaSun,
  FaMoon,
  FaDesktop,
  FaSave,
  FaUndo,
  FaDownload,
  FaUpload,
  FaEye,
} from "react-icons/fa";

type ThemeColor = {
  name: string;
  property: string;
  value: string;
  description: string;
};

type Theme = {
  id: string;
  name: string;
  type: "light" | "dark" | "auto";
  colors: Record<string, string>;
  custom: boolean;
};

type Props = {
  onThemeChange?: (theme: Theme) => void;
};

export const ThemeCustomizer: React.FC<Props> = ({ onThemeChange }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const defaultThemes: Theme[] = [
    {
      id: "dark-default",
      name: "Dark Default",
      type: "dark",
      custom: false,
      colors: {
        background: "#1a1a1a",
        surface: "#2d2d2d",
        "surface-hover": "#3a3a3a",
        border: "#404040",
        text: "#ffffff",
        "text-secondary": "#a0a0a0",
        accent: "#007acc",
        "accent-hover": "#005a9e",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336",
        info: "#2196f3",
        selection: "#264f78",
        highlight: "#ffff00",
        sidebar: "#252526",
        statusbar: "#007acc",
        "editor-bg": "#1e1e1e",
        "editor-text": "#d4d4d4",
        "editor-line": "#2d2d30",
        "editor-cursor": "#ffffff",
        "editor-selection": "#264f78",
        "terminal-bg": "#0c0c0c",
        "terminal-text": "#cccccc",
      },
    },
    {
      id: "light-default",
      name: "Light Default",
      type: "light",
      custom: false,
      colors: {
        background: "#ffffff",
        surface: "#f3f3f3",
        "surface-hover": "#e8e8e8",
        border: "#d0d0d0",
        text: "#333333",
        "text-secondary": "#666666",
        accent: "#007acc",
        "accent-hover": "#005a9e",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336",
        info: "#2196f3",
        selection: "#add6ff",
        highlight: "#ffff00",
        sidebar: "#f3f3f3",
        statusbar: "#007acc",
        "editor-bg": "#ffffff",
        "editor-text": "#333333",
        "editor-line": "#f0f0f0",
        "editor-cursor": "#333333",
        "editor-selection": "#add6ff",
        "terminal-bg": "#ffffff",
        "terminal-text": "#333333",
      },
    },
    {
      id: "monokai",
      name: "Monokai",
      type: "dark",
      custom: false,
      colors: {
        background: "#272822",
        surface: "#3e3d32",
        "surface-hover": "#49483e",
        border: "#75715e",
        text: "#f8f8f2",
        "text-secondary": "#a6e22e",
        accent: "#66d9ef",
        "accent-hover": "#5ac8d8",
        success: "#a6e22e",
        warning: "#e6db74",
        error: "#f92672",
        info: "#66d9ef",
        selection: "#49483e",
        highlight: "#ffff00",
        sidebar: "#272822",
        statusbar: "#66d9ef",
        "editor-bg": "#272822",
        "editor-text": "#f8f8f2",
        "editor-line": "#3e3d32",
        "editor-cursor": "#f8f8f2",
        "editor-selection": "#49483e",
        "terminal-bg": "#272822",
        "terminal-text": "#f8f8f2",
      },
    },
    {
      id: "solarized-dark",
      name: "Solarized Dark",
      type: "dark",
      custom: false,
      colors: {
        background: "#002b36",
        surface: "#073642",
        "surface-hover": "#0d4f5c",
        border: "#586e75",
        text: "#93a1a1",
        "text-secondary": "#839496",
        accent: "#268bd2",
        "accent-hover": "#1e6b99",
        success: "#859900",
        warning: "#b58900",
        error: "#dc322f",
        info: "#268bd2",
        selection: "#073642",
        highlight: "#ffff00",
        sidebar: "#002b36",
        statusbar: "#268bd2",
        "editor-bg": "#002b36",
        "editor-text": "#93a1a1",
        "editor-line": "#073642",
        "editor-cursor": "#93a1a1",
        "editor-selection": "#073642",
        "terminal-bg": "#002b36",
        "terminal-text": "#93a1a1",
      },
    },
  ];

  const colorProperties: ThemeColor[] = [
    {
      name: "Background",
      property: "background",
      value: "#1a1a1a",
      description: "Main background color",
    },
    {
      name: "Surface",
      property: "surface",
      value: "#2d2d2d",
      description: "Surface elements (panels, cards)",
    },
    {
      name: "Surface Hover",
      property: "surface-hover",
      value: "#3a3a3a",
      description: "Surface elements on hover",
    },
    {
      name: "Border",
      property: "border",
      value: "#404040",
      description: "Border color",
    },
    {
      name: "Text",
      property: "text",
      value: "#ffffff",
      description: "Primary text color",
    },
    {
      name: "Text Secondary",
      property: "text-secondary",
      value: "#a0a0a0",
      description: "Secondary text color",
    },
    {
      name: "Accent",
      property: "accent",
      value: "#007acc",
      description: "Primary accent color",
    },
    {
      name: "Accent Hover",
      property: "accent-hover",
      value: "#005a9e",
      description: "Accent color on hover",
    },
    {
      name: "Success",
      property: "success",
      value: "#4caf50",
      description: "Success state color",
    },
    {
      name: "Warning",
      property: "warning",
      value: "#ff9800",
      description: "Warning state color",
    },
    {
      name: "Error",
      property: "error",
      value: "#f44336",
      description: "Error state color",
    },
    {
      name: "Info",
      property: "info",
      value: "#2196f3",
      description: "Info state color",
    },
    {
      name: "Selection",
      property: "selection",
      value: "#264f78",
      description: "Selection background",
    },
    {
      name: "Highlight",
      property: "highlight",
      value: "#ffff00",
      description: "Highlight color",
    },
    {
      name: "Sidebar",
      property: "sidebar",
      value: "#252526",
      description: "Sidebar background",
    },
    {
      name: "Status Bar",
      property: "statusbar",
      value: "#007acc",
      description: "Status bar background",
    },
    {
      name: "Editor Background",
      property: "editor-bg",
      value: "#1e1e1e",
      description: "Code editor background",
    },
    {
      name: "Editor Text",
      property: "editor-text",
      value: "#d4d4d4",
      description: "Code editor text",
    },
    {
      name: "Editor Line",
      property: "editor-line",
      value: "#2d2d30",
      description: "Code editor line numbers",
    },
    {
      name: "Editor Cursor",
      property: "editor-cursor",
      value: "#ffffff",
      description: "Code editor cursor",
    },
    {
      name: "Editor Selection",
      property: "editor-selection",
      value: "#264f78",
      description: "Code editor selection",
    },
    {
      name: "Terminal Background",
      property: "terminal-bg",
      value: "#0c0c0c",
      description: "Terminal background",
    },
    {
      name: "Terminal Text",
      property: "terminal-text",
      value: "#cccccc",
      description: "Terminal text",
    },
  ];

  useEffect(() => {
    // Load themes from localStorage
    const savedThemes = localStorage.getItem("vybe-themes");
    if (savedThemes) {
      setThemes(JSON.parse(savedThemes));
    } else {
      setThemes(defaultThemes);
    }

    // Load active theme
    const activeThemeId =
      localStorage.getItem("vybe-active-theme") || "dark-default";
    const theme = themes.find((t) => t.id === activeThemeId) || themes[0];
    setActiveTheme(theme);
    setCustomColors(theme.colors);
  }, []);

  useEffect(() => {
    if (activeTheme) {
      applyTheme(activeTheme);
    }
  }, [activeTheme]);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(`--color-${property}`, value);
    });

    // Update body class for theme type
    document.body.className = document.body.className.replace(/theme-\w+/g, "");
    document.body.classList.add(`theme-${theme.type}`);
  };

  const createCustomTheme = () => {
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: "Custom Theme",
      type: "dark",
      custom: true,
      colors: { ...customColors },
    };

    const updatedThemes = [...themes, newTheme];
    setThemes(updatedThemes);
    localStorage.setItem("vybe-themes", JSON.stringify(updatedThemes));

    setActiveTheme(newTheme);
    localStorage.setItem("vybe-active-theme", newTheme.id);
  };

  const updateCustomColors = (property: string, value: string) => {
    const newColors = { ...customColors, [property]: value };
    setCustomColors(newColors);

    if (activeTheme?.custom) {
      const updatedTheme = { ...activeTheme, colors: newColors };
      setActiveTheme(updatedTheme);

      const updatedThemes = themes.map((t) =>
        t.id === activeTheme.id ? updatedTheme : t,
      );
      setThemes(updatedThemes);
      localStorage.setItem("vybe-themes", JSON.stringify(updatedThemes));
    }
  };

  const selectTheme = (theme: Theme) => {
    setActiveTheme(theme);
    setCustomColors(theme.colors);
    localStorage.setItem("vybe-active-theme", theme.id);

    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    const updatedThemes = themes.filter((t) => t.id !== themeId);
    setThemes(updatedThemes);
    localStorage.setItem("vybe-themes", JSON.stringify(updatedThemes));

    if (activeTheme?.id === themeId) {
      const defaultTheme = themes.find((t) => !t.custom) || themes[0];
      selectTheme(defaultTheme);
    }
  };

  const exportTheme = (theme: Theme) => {
    const dataStr = JSON.stringify(theme, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${theme.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTheme: Theme = JSON.parse(e.target?.result as string);
        importedTheme.id = `imported-${Date.now()}`;
        importedTheme.custom = true;

        const updatedThemes = [...themes, importedTheme];
        setThemes(updatedThemes);
        localStorage.setItem("vybe-themes", JSON.stringify(updatedThemes));

        selectTheme(importedTheme);
      } catch (error) {
        console.error("Failed to import theme:", error);
      }
    };
    reader.readAsText(file);
  };

  const resetToDefaults = () => {
    setThemes(defaultThemes);
    localStorage.setItem("vybe-themes", JSON.stringify(defaultThemes));

    const defaultTheme = defaultThemes[0];
    selectTheme(defaultTheme);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaPalette className="text-blue-400" />
            <span className="font-medium">Theme Customizer</span>
          </div>

          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <FaEye className="w-3 h-3 mr-1" />
              Preview
            </button>
            <button
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              onClick={createCustomTheme}
            >
              <FaSave className="w-3 h-3 mr-1" />
              Save
            </button>
            <label className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm cursor-pointer">
              <FaUpload className="w-3 h-3 mr-1" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
              />
            </label>
            <button
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              onClick={resetToDefaults}
            >
              <FaUndo className="w-3 h-3 mr-1" />
              Reset
            </button>
          </div>
        </div>

        {/* Theme type selector */}
        <div className="flex space-x-2 mb-2">
          {[
            { id: "dark", name: "Dark", icon: <FaMoon /> },
            { id: "light", name: "Light", icon: <FaSun /> },
            { id: "auto", name: "Auto", icon: <FaDesktop /> },
          ].map(({ id, name, icon }) => (
            <button
              key={id}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                activeTheme?.type === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
              onClick={() => {
                if (activeTheme) {
                  const updatedTheme = { ...activeTheme, type: id as any };
                  setActiveTheme(updatedTheme);
                }
              }}
            >
              {icon}
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme selector */}
      <div className="p-2 border-b border-gray-700">
        <div className="text-sm font-medium mb-2">Available Themes</div>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`p-2 rounded cursor-pointer border ${
                activeTheme?.id === theme.id
                  ? "border-blue-500 bg-blue-900"
                  : "border-gray-600 hover:border-gray-500"
              }`}
              onClick={() => selectTheme(theme)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{theme.name}</span>
                <div className="flex space-x-1">
                  {theme.custom && (
                    <button
                      className="p-1 hover:bg-gray-700 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportTheme(theme);
                      }}
                      title="Export theme"
                    >
                      <FaDownload className="w-3 h-3" />
                    </button>
                  )}
                  {theme.custom && (
                    <button
                      className="p-1 hover:bg-gray-700 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomTheme(theme.id);
                      }}
                      title="Delete theme"
                    >
                      <FaUndo className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">{theme.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Color customization */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-sm font-medium mb-2">Color Customization</div>
        <div className="space-y-2">
          {colorProperties.map((color) => (
            <div key={color.property} className="flex items-center space-x-3">
              <div className="w-24 text-sm">{color.name}</div>

              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1">
                  {color.description}
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
                    style={{
                      backgroundColor:
                        customColors[color.property] || color.value,
                    }}
                    onClick={() => setShowColorPicker(color.property)}
                  />
                  <input
                    type="text"
                    value={customColors[color.property] || color.value}
                    onChange={(e) =>
                      updateCustomColors(color.property, e.target.value)
                    }
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Color picker modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Choose Color</div>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {[
                "#000000",
                "#333333",
                "#666666",
                "#999999",
                "#cccccc",
                "#ffffff",
                "#ff0000",
                "#00ff00",
                "#0000ff",
                "#ffff00",
                "#ff00ff",
                "#00ffff",
                "#800000",
                "#008000",
                "#000080",
                "#808000",
                "#800080",
                "#008080",
                "#ff8000",
                "#80ff00",
                "#0080ff",
                "#ff0080",
                "#80ffff",
                "#ffff80",
                "#400000",
                "#004000",
                "#000040",
                "#404000",
                "#400040",
                "#004040",
                "#ff4000",
                "#40ff00",
                "#0040ff",
                "#ff0040",
                "#40ffff",
                "#ffff40",
                "#007acc",
                "#4caf50",
                "#ff9800",
                "#f44336",
                "#2196f3",
                "#9c27b0",
                "#795548",
                "#607d8b",
                "#e91e63",
                "#3f51b5",
                "#00bcd4",
                "#8bc34a",
              ].map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-600"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    updateCustomColors(showColorPicker, color);
                    setShowColorPicker(null);
                  }}
                />
              ))}
            </div>
            <button
              className="w-full px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              onClick={() => setShowColorPicker(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Exports
export { ThemeCustomizer };
