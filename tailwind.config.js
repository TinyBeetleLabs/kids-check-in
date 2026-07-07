/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          focus: '#4f46e5',
          light: '#818cf8',
          'on-dark': '#a5b4fc',
        },
        navy: {
          DEFAULT: '#1e2a4a',
          dark: '#151d33',
        },
        ink: {
          DEFAULT: '#1e293b',
          'muted-80': '#475569',
          'muted-48': '#94a3b8',
        },
        body: {
          DEFAULT: '#1e293b',
          'on-dark': '#ffffff',
          muted: '#cbd5e1',
        },
        canvas: {
          DEFAULT: '#ffffff',
          parchment: '#f4f6fb',
        },
        surface: {
          pearl: '#f8fafc',
          'tile-1': '#334155',
          'tile-2': '#2a2a2c',
          'tile-3': '#252527',
          black: '#1e2a4a',
          chip: '#e2e8f0',
        },
        divider: {
          soft: '#f1f5f9',
        },
        hairline: '#e2e8f0',
        on: {
          primary: '#ffffff',
          dark: '#ffffff',
        },
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '17px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        section: '80px',
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        pill: '9999px',
      },
      fontFamily: {
        display: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        text: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        'hero-display': ['56px', { lineHeight: '1.07', letterSpacing: '-0.28px', fontWeight: '700' }],
        'display-lg': ['40px', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '700' }],
        'display-md': ['28px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }],
        tagline: ['20px', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '600' }],
        'body-strong': ['16px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'caption-strong': ['14px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
        'button-large': ['16px', { lineHeight: '1', letterSpacing: '0', fontWeight: '600' }],
        'button-utility': ['13px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '500' }],
        'fine-print': ['12px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '400' }],
        'nav-link': ['14px', { lineHeight: '1', letterSpacing: '0', fontWeight: '600' }],
      },
      maxWidth: {
        content: '1440px',
        'content-narrow': '980px',
      },
      boxShadow: {
        product: '0 4px 24px rgba(30, 42, 74, 0.12)',
        card: '0 2px 12px rgba(30, 42, 74, 0.08)',
        'card-hover': '0 8px 24px rgba(30, 42, 74, 0.14)',
      },
    },
  },
  plugins: [],
};
