const { fontFamily } = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Editor specific colors
        editor: {
          DEFAULT: 'hsl(var(--editor-background))',
          foreground: 'hsl(var(--editor-foreground))',
          selection: 'hsl(var(--editor-selection))',
          lineHighlight: 'hsl(var(--editor-line-highlight))',
          cursor: 'hsl(var(--editor-cursor))',
        },
        // Status bar colors
        statusBar: {
          DEFAULT: 'hsl(var(--status-bar-background))',
          foreground: 'hsl(var(--status-bar-foreground))',
          border: 'hsl(var(--status-bar-border))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-in-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
      // Custom utilities
      boxShadow: {
        'editor-widget': '0 0 8px 2px rgba(0, 0, 0, 0.1)',
        'panel': '0 0 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      // Custom spacing for editor
      spacing: {
        'editor-gutter': 'var(--editor-gutter-width, 30px)',
        'status-bar': 'var(--status-bar-height, 22px)',
      },
      // Custom z-index layers
      zIndex: {
        'editor-widget': '100',
        'status-bar': '50',
        'panel': '40',
        'modal': '1000',
        'toast': '2000',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/line-clamp'),
    require('tailwindcss-animate'),
    // Custom plugin for editor-specific styles
    plugin(function({ addBase, addComponents, theme }) {
      // Base styles
      addBase({
        ':root': {
          '--background': '0 0% 100%',
          '--foreground': '222.2 84% 4.9%',
          '--editor-background': '0 0% 100%',
          '--editor-foreground': '222.2 84% 4.9%',
          '--editor-selection': '215 20.2% 65.1%',
          '--editor-line-highlight': '210 40% 98%',
          '--editor-cursor': '222.2 84% 4.9%',
          '--status-bar-background': '210 40% 98%',
          '--status-bar-foreground': '215.4 16.3% 46.9%',
          '--status-bar-border': '214.3 31.8% 91.4%',
        },
        '.dark': {
          '--background': '222.2 84% 4.9%',
          '--foreground': '210 40% 98%',
          '--editor-background': '222.2 84% 4.9%',
          '--editor-foreground': '210 40% 98%',
          '--editor-selection': '215 27.9% 16.9%',
          '--editor-line-highlight': '215 27.9% 16.9%',
          '--editor-cursor': '210 40% 98%',
          '--status-bar-background': '215 28% 17%',
          '--status-bar-foreground': '215 20.2% 65.1%',
          '--status-bar-border': '215 27.9% 16.9%',
        },
      });

      // Component styles
      addComponents({
        // Scrollbar styles
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': `${theme('colors.gray.400')} transparent`,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.gray.400'),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme('colors.gray.500'),
          },
        },
        // Editor specific styles
        '.editor-container': {
          '--editor-gutter-width': '30px',
          '--status-bar-height': '22px',
        },
        // Status bar styles
        '.status-bar': {
          height: 'var(--status-bar-height)',
          backgroundColor: 'hsl(var(--status-bar-background))',
          color: 'hsl(var(--status-bar-foreground))',
          borderTop: '1px solid hsl(var(--status-bar-border))',
          fontSize: theme('fontSize.xs'),
          fontFamily: theme('fontFamily.mono').join(', '),
          display: 'flex',
          alignItems: 'center',
          padding: '0 0.5rem',
        },
      });
    }),
  ],
}