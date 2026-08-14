// Enhanced Theme System for Vybe 2.0
// This file provides a comprehensive design system with semantic tokens, typography, and spacing

export interface Theme {
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceHighlight: string;

    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverted: string;

    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryText: string;

    // Secondary colors
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    secondaryText: string;

    // Status colors
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;

    // UI colors
    border: string;
    divider: string;
    overlay: string;

    // Interactive states
    hover: string;
    active: string;
    selected: string;
    disabled: string;
  };

  typography: {
    fontFamily: {
      sans: string;
      mono: string;
      display: string;
    };

    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
      "5xl": string;
    };

    lineHeight: {
      none: string;
      tight: string;
      snug: string;
      normal: string;
      relaxed: string;
      loose: string;
    };

    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
      extrabold: number;
    };

    letterSpacing: {
      tighter: string;
      tight: string;
      normal: string;
      wide: string;
      wider: string;
    };
  };

  spacing: {
    px: string;
    0: string;
    0.5: string;
    1: string;
    1.5: string;
    2: string;
    2.5: string;
    3: string;
    3.5: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
    14: string;
    16: string;
    20: string;
    24: string;
    28: string;
    32: string;
    36: string;
    40: string;
    44: string;
    48: string;
    52: string;
    56: string;
    60: string;
    64: string;
    72: string;
    80: string;
    96: string;
  };

  borderRadius: {
    none: string;
    sm: string;
    DEFAULT: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    full: string;
  };

  shadows: {
    xs: string;
    sm: string;
    DEFAULT: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    inner: string;
    none: string;
  };

  zIndex: {
    hide: number;
    auto: string;
    base: number;
    docked: number;
    dropdown: number;
    sticky: number;
    banner: number;
    overlay: number;
    modal: number;
    popover: number;
    skipLink: number;
    toast: number;
    tooltip: number;
  };

  transition: {
    duration: {
      fastest: string;
      faster: string;
      fast: string;
      normal: string;
      slow: string;
      slower: string;
      slowest: string;
    };
    easing: {
      default: string;
      in: string;
      out: string;
      inOut: string;
    };
  };
}

// Base theme with all the structure
export const baseTheme: Theme = {
  colors: {
    background: "#ffffff",
    surface: "#f8fafc",
    surfaceElevated: "#ffffff",
    surfaceHighlight: "#f1f5f9",
    text: "#0f172a",
    textSecondary: "#475569",
    textTertiary: "#94a3b8",
    textInverted: "#ffffff",
    primary: "#3b82f6",
    primaryLight: "#60a5fa",
    primaryDark: "#2563eb",
    primaryText: "#ffffff",
    secondary: "#64748b",
    secondaryLight: "#94a3b8",
    secondaryDark: "#475569",
    secondaryText: "#ffffff",
    success: "#10b981",
    successLight: "#6ee7b7",
    warning: "#f59e0b",
    warningLight: "#fcd34d",
    error: "#ef4444",
    errorLight: "#fca5a5",
    info: "#3b82f6",
    infoLight: "#93c5fd",
    border: "#e2e8f0",
    divider: "#e2e8f0",
    overlay: "rgba(15, 23, 42, 0.5)",
    hover: "#f1f5f9",
    active: "#e2e8f0",
    selected: "#e0f2fe",
    disabled: "#94a3b8",
  },
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      display:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    lineHeight: {
      none: "1",
      tight: "1.25",
      snug: "1.375",
      normal: "1.5",
      relaxed: "1.625",
      loose: "2",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    letterSpacing: {
      tighter: "-0.05em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",
    },
  },
  spacing: {
    px: "1px",
    0: "0px",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    3.5: "0.875rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    11: "2.75rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    28: "7rem",
    32: "8rem",
    36: "9rem",
    40: "10rem",
    44: "11rem",
    48: "12rem",
    52: "13rem",
    56: "14rem",
    60: "15rem",
    64: "16rem",
    72: "18rem",
    80: "20rem",
    96: "24rem",
  },
  borderRadius: {
    none: "0px",
    sm: "0.125rem",
    DEFAULT: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    none: "none",
  },
  zIndex: {
    hide: -1,
    auto: "auto",
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
  transition: {
    duration: {
      fastest: "75ms",
      faster: "100ms",
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
      slower: "500ms",
      slowest: "700ms",
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
};

// Light theme
export const lightTheme: Theme = {
  ...baseTheme,
  // Light theme specific overrides can go here
};

// Dark theme
export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    background: "#0f172a",
    surface: "#1e293b",
    surfaceElevated: "#334155",
    surfaceHighlight: "#2d3748",
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textTertiary: "#94a3b8",
    textInverted: "#0f172a",
    primary: "#60a5fa",
    primaryLight: "#93c5fd",
    primaryDark: "#3b82f6",
    primaryText: "#0f172a",
    secondary: "#94a3b8",
    secondaryLight: "#cbd5e1",
    secondaryDark: "#64748b",
    secondaryText: "#0f172a",
    success: "#34d399",
    successLight: "#6ee7b7",
    warning: "#fbbf24",
    warningLight: "#fcd34d",
    error: "#f87171",
    errorLight: "#fca5a5",
    info: "#60a5fa",
    infoLight: "#93c5fd",
    border: "#334155",
    divider: "#334155",
    overlay: "rgba(15, 23, 42, 0.8)",
    hover: "#1e293b",
    active: "#334155",
    selected: "#1e40af",
    disabled: "#4b5563",
  },
  shadows: {
    ...baseTheme.shadows,
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.2)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.25), 0 1px 2px -1px rgb(0 0 0 / 0.25)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.25), 0 1px 2px -1px rgb(0 0 0 / 0.25)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.25), 0 2px 4px -2px rgb(0 0 0 / 0.25)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.25), 0 4px 6px -4px rgb(0 0 0 / 0.25)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.25)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.5)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.15)",
  },
};

// Export the default theme
export default {
  light: lightTheme,
  dark: darkTheme,
};
