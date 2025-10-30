export const theme = {
  colors: {
    background: {
      primary: '#1E1E1E',
      secondary: '#252526',
      tertiary: '#2D2D2D',
      hover: '#2A2D2E',
      active: '#37373D',
      accent: '#007ACC',
    },
    text: {
      primary: '#D4D4D4',
      secondary: '#858585',
      accent: '#007ACC',
    },
    border: {
      primary: '#333',
      secondary: '#444',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    glow: '0 0 8px rgba(0, 122, 204, 0.5)',
  },
  transitions: {
    default: 'all 0.2s ease-in-out',
    hover: 'all 0.15s ease-in-out',
  },
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    toast: 500,
    tooltip: 600,
  },
};
