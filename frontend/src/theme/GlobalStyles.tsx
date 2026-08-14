import { createGlobalStyle } from "styled-components";
import { lightTheme } from "./enhancedTheme";

export const GlobalStyles = createGlobalStyle`
  :root {
    /* Set default theme to light */
    --color-background: ${lightTheme.colors.background};
    --color-surface: ${lightTheme.colors.surface};
    --color-surfaceElevated: ${lightTheme.colors.surfaceElevated};
    --color-surfaceHighlight: ${lightTheme.colors.surfaceHighlight};

    /* Text colors */
    --color-text: ${lightTheme.colors.text};
    --color-textSecondary: ${lightTheme.colors.textSecondary};
    --color-textTertiary: ${lightTheme.colors.textTertiary};
    --color-textInverted: ${lightTheme.colors.textInverted};

    /* Primary colors */
    --color-primary: ${lightTheme.colors.primary};
    --color-primaryLight: ${lightTheme.colors.primaryLight};
    --color-primaryDark: ${lightTheme.colors.primaryDark};
    --color-primaryText: ${lightTheme.colors.primaryText};

    /* Secondary colors */
    --color-secondary: ${lightTheme.colors.secondary};
    --color-secondaryLight: ${lightTheme.colors.secondaryLight};
    --color-secondaryDark: ${lightTheme.colors.secondaryDark};
    --color-secondaryText: ${lightTheme.colors.secondaryText};

    /* Status colors */
    --color-success: ${lightTheme.colors.success};
    --color-successLight: ${lightTheme.colors.successLight};
    --color-warning: ${lightTheme.colors.warning};
    --color-warningLight: ${lightTheme.colors.warningLight};
    --color-error: ${lightTheme.colors.error};
    --color-errorLight: ${lightTheme.colors.errorLight};
    --color-info: ${lightTheme.colors.info};
    --color-infoLight: ${lightTheme.colors.infoLight};

    /* UI colors */
    --color-border: ${lightTheme.colors.border};
    --color-divider: ${lightTheme.colors.divider};
    --color-overlay: ${lightTheme.colors.overlay};
    --color-hover: ${lightTheme.colors.hover};
    --color-active: ${lightTheme.colors.active};
    --color-selected: ${lightTheme.colors.selected};
    --color-disabled: ${lightTheme.colors.disabled};

    /* Typography */
    --font-sans: ${lightTheme.typography.fontFamily.sans};
    --font-mono: ${lightTheme.typography.fontFamily.mono};
    --font-display: ${lightTheme.typography.fontFamily.display};

    /* Font sizes */
    --font-size-xs: ${lightTheme.typography.fontSize.xs};
    --font-size-sm: ${lightTheme.typography.fontSize.sm};
    --font-size-base: ${lightTheme.typography.fontSize.base};
    --font-size-lg: ${lightTheme.typography.fontSize.lg};
    --font-size-xl: ${lightTheme.typography.fontSize.xl};
    --font-size-2xl: ${lightTheme.typography.fontSize["2xl"]};
    --font-size-3xl: ${lightTheme.typography.fontSize["3xl"]};
    --font-size-4xl: ${lightTheme.typography.fontSize["4xl"]};
    --font-size-5xl: ${lightTheme.typography.fontSize["5xl"]};

    /* Font weights */
    --font-weight-regular: ${lightTheme.typography.fontWeight.regular};
    --font-weight-medium: ${lightTheme.typography.fontWeight.medium};
    --font-weight-semibold: ${lightTheme.typography.fontWeight.semibold};
    --font-weight-bold: ${lightTheme.typography.fontWeight.bold};
    --font-weight-extrabold: ${lightTheme.typography.fontWeight.extrabold};

    /* Line heights */
    --line-height-none: ${lightTheme.typography.lineHeight.none};
    --line-height-tight: ${lightTheme.typography.lineHeight.tight};
    --line-height-snug: ${lightTheme.typography.lineHeight.snug};
    --line-height-normal: ${lightTheme.typography.lineHeight.normal};
    --line-height-relaxed: ${lightTheme.typography.lineHeight.relaxed};
    --line-height-loose: ${lightTheme.typography.lineHeight.loose};

    /* Letter spacing */
    --letter-spacing-tighter: ${lightTheme.typography.letterSpacing.tighter};
    --letter-spacing-tight: ${lightTheme.typography.letterSpacing.tight};
    --letter-spacing-normal: ${lightTheme.typography.letterSpacing.normal};
    --letter-spacing-wide: ${lightTheme.typography.letterSpacing.wide};
    --letter-spacing-wider: ${lightTheme.typography.letterSpacing.wider};

    /* Spacing */
    --spacing-px: ${lightTheme.spacing.px};
    --spacing-0: ${lightTheme.spacing[0]};
    --spacing-0_5: ${lightTheme.spacing[0.5]};
    --spacing-1: ${lightTheme.spacing[1]};
    --spacing-1_5: ${lightTheme.spacing[1.5]};
    --spacing-2: ${lightTheme.spacing[2]};
    --spacing-2_5: ${lightTheme.spacing[2.5]};
    --spacing-3: ${lightTheme.spacing[3]};
    --spacing-3_5: ${lightTheme.spacing[3.5]};
    --spacing-4: ${lightTheme.spacing[4]};
    --spacing-5: ${lightTheme.spacing[5]};
    --spacing-6: ${lightTheme.spacing[6]};
    --spacing-7: ${lightTheme.spacing[7]};
    --spacing-8: ${lightTheme.spacing[8]};
    --spacing-9: ${lightTheme.spacing[9]};
    --spacing-10: ${lightTheme.spacing[10]};
    --spacing-11: ${lightTheme.spacing[11]};
    --spacing-12: ${lightTheme.spacing[12]};
    --spacing-14: ${lightTheme.spacing[14]};
    --spacing-16: ${lightTheme.spacing[16]};
    --spacing-20: ${lightTheme.spacing[20]};
    --spacing-24: ${lightTheme.spacing[24]};
    --spacing-28: ${lightTheme.spacing[28]};
    --spacing-32: ${lightTheme.spacing[32]};
    --spacing-36: ${lightTheme.spacing[36]};
    --spacing-40: ${lightTheme.spacing[40]};
    --spacing-44: ${lightTheme.spacing[44]};
    --spacing-48: ${lightTheme.spacing[48]};
    --spacing-52: ${lightTheme.spacing[52]};
    --spacing-56: ${lightTheme.spacing[56]};
    --spacing-60: ${lightTheme.spacing[60]};
    --spacing-64: ${lightTheme.spacing[64]};
    --spacing-72: ${lightTheme.spacing[72]};
    --spacing-80: ${lightTheme.spacing[80]};
    --spacing-96: ${lightTheme.spacing[96]};

    /* Border radius */
    --border-radius-none: ${lightTheme.borderRadius.none};
    --border-radius-sm: ${lightTheme.borderRadius.sm};
    --border-radius: ${lightTheme.borderRadius.DEFAULT};
    --border-radius-md: ${lightTheme.borderRadius.md};
    --border-radius-lg: ${lightTheme.borderRadius.lg};
    --border-radius-xl: ${lightTheme.borderRadius.xl};
    --border-radius-2xl: ${lightTheme.borderRadius["2xl"]};
    --border-radius-3xl: ${lightTheme.borderRadius["3xl"]};
    --border-radius-full: ${lightTheme.borderRadius.full};

    /* Shadows */
    --shadow-xs: ${lightTheme.shadows.xs};
    --shadow-sm: ${lightTheme.shadows.sm};
    --shadow: ${lightTheme.shadows.DEFAULT};
    --shadow-md: ${lightTheme.shadows.md};
    --shadow-lg: ${lightTheme.shadows.lg};
    --shadow-xl: ${lightTheme.shadows.xl};
    --shadow-2xl: ${lightTheme.shadows["2xl"]};
    --shadow-inner: ${lightTheme.shadows.inner};
    --shadow-none: ${lightTheme.shadows.none};

    /* Z-index */
    --z-index-hide: ${lightTheme.zIndex.hide};
    --z-index-base: ${lightTheme.zIndex.base};
    --z-index-docked: ${lightTheme.zIndex.docked};
    --z-index-dropdown: ${lightTheme.zIndex.dropdown};
    --z-index-sticky: ${lightTheme.zIndex.sticky};
    --z-index-banner: ${lightTheme.zIndex.banner};
    --z-index-overlay: ${lightTheme.zIndex.overlay};
    --z-index-modal: ${lightTheme.zIndex.modal};
    --z-index-popover: ${lightTheme.zIndex.popover};
    --z-index-skipLink: ${lightTheme.zIndex.skipLink};
    --z-index-toast: ${lightTheme.zIndex.toast};
    --z-index-tooltip: ${lightTheme.zIndex.tooltip};

    /* Transitions */
    --transition-duration-fastest: ${lightTheme.transition.duration.fastest};
    --transition-duration-faster: ${lightTheme.transition.duration.faster};
    --transition-duration-fast: ${lightTheme.transition.duration.fast};
    --transition-duration-normal: ${lightTheme.transition.duration.normal};
    --transition-duration-slow: ${lightTheme.transition.duration.slow};
    --transition-duration-slower: ${lightTheme.transition.duration.slower};
    --transition-duration-slowest: ${lightTheme.transition.duration.slowest};

    --transition-easing-default: ${lightTheme.transition.easing.default};
    --transition-easing-in: ${lightTheme.transition.easing.in};
    --transition-easing-out: ${lightTheme.transition.easing.out};
    --transition-easing-inOut: ${lightTheme.transition.easing.inOut};
  }

  /* Dark theme overrides */
  .dark {
    --color-background: ${lightTheme.colors.background};
    --color-surface: ${lightTheme.colors.surface};
    --color-surfaceElevated: ${lightTheme.colors.surfaceElevated};
    --color-surfaceHighlight: ${lightTheme.colors.surfaceHighlight};
    --color-text: ${lightTheme.colors.text};
    --color-textSecondary: ${lightTheme.colors.textSecondary};
    --color-textTertiary: ${lightTheme.colors.textTertiary};
    --color-primary: ${lightTheme.colors.primary};
    --color-primaryLight: ${lightTheme.colors.primaryLight};
    --color-primaryDark: ${lightTheme.colors.primaryDark};
    --color-secondary: ${lightTheme.colors.secondary};
    --color-secondaryLight: ${lightTheme.colors.secondaryLight};
    --color-secondaryDark: ${lightTheme.colors.secondaryDark};
    --color-border: ${lightTheme.colors.border};
    --color-divider: ${lightTheme.colors.divider};
    --color-hover: ${lightTheme.colors.hover};
    --color-active: ${lightTheme.colors.active};
    --color-disabled: ${lightTheme.colors.disabled};
  }

  /* Base styles */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 100%;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    min-height: 100%;
    font-family: var(--font-sans);
    line-height: var(--line-height-normal);
    color: var(--color-text);
    background-color: var(--color-background);
    transition: background-color var(--transition-duration-normal) var(--transition-easing-default);
  }

  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    margin-bottom: var(--spacing-4);
  }

  h1 { font-size: var(--font-size-4xl); }
  h2 { font-size: var(--font-size-3xl); }
  h3 { font-size: var(--font-size-2xl); }
  h4 { font-size: var(--font-size-xl); }
  h5 { font-size: var(--font-size-lg); }
  h6 { font-size: var(--font-size-base); }

  p {
    margin-bottom: var(--spacing-4);
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--transition-duration-normal) var(--transition-easing-default);

    &:hover {
      color: var(--color-primaryDark);
      text-decoration: underline;
    }
  }

  /* Buttons */
  button {
    font-family: inherit;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    padding: var(--spacing-2) var(--spacing-4);
    transition: all var(--transition-duration-normal) var(--transition-easing-default);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  /* Forms */
  input,
  select,
  textarea {
    font-family: inherit;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: var(--spacing-2) var(--spacing-3);
    transition: all var(--transition-duration-normal) var(--transition-easing-default);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primaryLight);
    }

    &:disabled {
      background-color: var(--color-disabled);
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  /* Utilities */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
    max-width: 1280px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--color-surface);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;

    &:hover {
      background: var(--color-textTertiary);
    }
  }
`;
