import React, { useState, useEffect } from "react";

type Theme = "dark" | "light" | "auto";

interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentHover: string;
}

const themes: Record<"dark" | "light", ThemeColors> = {
  dark: {
    bg: "#1e1e1e",
    bgSecondary: "#252526",
    bgTertiary: "#2d2d30",
    text: "#cccccc",
    textSecondary: "#858585",
    border: "#3e3e42",
    accent: "#0e639c",
    accentHover: "#1177bb",
  },
  light: {
    bg: "#ffffff",
    bgSecondary: "#f3f3f3",
    bgTertiary: "#e8e8e8",
    text: "#333333",
    textSecondary: "#6c6c6c",
    border: "#d4d4d4",
    accent: "#0066cc",
    accentHover: "#0052a3",
  },
};

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("vybe-theme");
    return (saved as Theme) || "dark";
  });

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Detect system theme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // Apply theme
    const activeTheme = theme === "auto" ? systemTheme : theme;
    const colors = themes[activeTheme];

    // Apply CSS variables
    document.documentElement.style.setProperty("--color-bg", colors.bg);
    document.documentElement.style.setProperty("--color-bg-secondary", colors.bgSecondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", colors.bgTertiary);
    document.documentElement.style.setProperty("--color-text", colors.text);
    document.documentElement.style.setProperty("--color-text-secondary", colors.textSecondary);
    document.documentElement.style.setProperty("--color-border", colors.border);
    document.documentElement.style.setProperty("--color-accent", colors.accent);
    document.documentElement.style.setProperty("--color-accent-hover", colors.accentHover);

    // Save to localStorage
    localStorage.setItem("vybe-theme", theme);

    // Update body class for Tailwind
    document.body.classList.remove("dark", "light");
    document.body.classList.add(activeTheme);
  }, [theme, systemTheme]);

  const cycleTheme = () => {
    setTheme((current) => {
      if (current === "dark") return "light";
      if (current === "light") return "auto";
      return "dark";
    });
  };

  const getIcon = () => {
    if (theme === "dark") {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      );
    }
    if (theme === "light") {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    );
  };

  const getLabel = () => {
    if (theme === "dark") return "Dark";
    if (theme === "light") return "Light";
    return "Auto";
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-gray-100 transition-colors"
      title={`Theme: ${getLabel()} (click to cycle)`}
    >
      {getIcon()}
      <span className="text-xs font-medium">{getLabel()}</span>
    </button>
  );
};

// Hook to use theme in components
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("vybe-theme");
    return (saved as Theme) || "dark";
  });

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const activeTheme = theme === "auto" ? systemTheme : theme;

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("vybe-theme", newTheme);
  };

  return {
    theme,
    activeTheme,
    setTheme: updateTheme,
    colors: themes[activeTheme],
  };
};