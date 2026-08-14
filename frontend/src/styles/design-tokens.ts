// Design Tokens - Modern UI Design System
// Inspired by Cursor, Kiro, Replit, and Bolt

export const colors = {
  // Neutral grays (primary UI colors)
  gray: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },

  // Primary colors (Purple - Main brand color)
  primary: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7c3aed",
    800: "#6b21a8",
    900: "#581c87",
  },

  // Secondary colors (Cyan - Accent color)
  secondary: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
  },

  // Semantic colors (using unified palette)
  success: {
    50: "#ecfeff",
    500: "#06b6d4", // Cyan for success
    600: "#0891b2",
    700: "#0e7490",
  },
  warning: {
    50: "#faf5ff",
    500: "#a855f7", // Purple for warning
    600: "#9333ea",
    700: "#7c3aed",
  },
  error: {
    50: "#faf5ff",
    500: "#a855f7", // Purple for error (softer than red)
    600: "#9333ea",
    700: "#7c3aed",
  },
  info: {
    50: "#ecfeff",
    500: "#06b6d4", // Cyan for info
    600: "#0891b2",
    700: "#0e7490",
  },

  // Code syntax colors (GitHub Dark inspired)
  syntax: {
    keyword: "#ff7b72",
    string: "#a5d6ff",
    comment: "#8b949e",
    function: "#d2a8ff",
    variable: "#ffa657",
    number: "#79c0ff",
    operator: "#ff7b72",
    punctuation: "#e6edf3",
  },

  // Dark theme colors
  dark: {
    bg: {
      primary: "#0d1117",
      secondary: "#161b22",
      tertiary: "#21262d",
      elevated: "#30363d",
    },
    fg: {
      primary: "#e6edf3",
      secondary: "#7d8590",
      tertiary: "#656d76",
      muted: "#484f58",
    },
    border: {
      default: "#30363d",
      muted: "#21262d",
      subtle: "#1c2128",
    },
  },

  // Light theme colors
  light: {
    bg: {
      primary: "#ffffff",
      secondary: "#f6f8fa",
      tertiary: "#f1f3f4",
      elevated: "#ffffff",
    },
    fg: {
      primary: "#24292f",
      secondary: "#656d76",
      tertiary: "#7d8590",
      muted: "#9a9a9a",
    },
    border: {
      default: "#d0d7de",
      muted: "#d8dee4",
      subtle: "#eaeef2",
    },
  },
};

export const typography = {
  fonts: {
    ui: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    code: 'JetBrains Mono, Consolas, "SF Mono", Monaco, "Cascadia Code", monospace',
  },
  sizes: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
};

export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  base: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  full: "9999px",
};

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  glow: "0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(6, 182, 212, 0.2)",
};

export const gradients = {
  primary: "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
  primaryReverse: "linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)",
  subtle:
    "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
  radial: "radial-gradient(circle at center, #a855f7 0%, #06b6d4 100%)",
};

export const animations = {
  durations: {
    fast: "150ms",
    normal: "250ms",
    slow: "350ms",
  },
  easings: {
    easeOut: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0.0, 1, 1)",
    easeInOut: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

// Theme configurations
export const themes = {
  dark: {
    colors: {
      background: {
        primary: colors.dark.bg.primary,
        secondary: colors.dark.bg.secondary,
        tertiary: colors.dark.bg.tertiary,
        elevated: colors.dark.bg.elevated,
      },
      foreground: {
        primary: colors.dark.fg.primary,
        secondary: colors.dark.fg.secondary,
        tertiary: colors.dark.fg.tertiary,
        muted: colors.dark.fg.muted,
      },
      border: {
        default: colors.dark.border.default,
        muted: colors.dark.border.muted,
        subtle: colors.dark.border.subtle,
      },
      accent: colors.primary,
      secondary: colors.secondary,
      semantic: {
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
      },
    },
  },
  light: {
    colors: {
      background: {
        primary: colors.light.bg.primary,
        secondary: colors.light.bg.secondary,
        tertiary: colors.light.bg.tertiary,
        elevated: colors.light.bg.elevated,
      },
      foreground: {
        primary: colors.light.fg.primary,
        secondary: colors.light.fg.secondary,
        tertiary: colors.light.fg.tertiary,
        muted: colors.light.fg.muted,
      },
      border: {
        default: colors.light.border.default,
        muted: colors.light.border.muted,
        subtle: colors.light.border.subtle,
      },
      accent: colors.primary,
      secondary: colors.secondary,
      semantic: {
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
      },
    },
  },
};
