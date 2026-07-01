/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        'bg-2': '#0f1522',
        panel: '#131b2b',
        'panel-2': '#182236',
        border: '#223049',
        muted: '#8896ad',
        accent: '#16d67a',
        'accent-2': '#0aa85e',
        gold: '#f5c542',
        'gold-2': '#d9a520',
        danger: '#ff5c6c',
        warn: '#ffb020',
        info: '#4aa8ff',
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        dark: {
          50: '#f9fafb',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: [
          '"Segoe UI"',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
