import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#16110e',
        surface: {
          DEFAULT: '#1f1813',
          raised: '#2a2019',
          hover: '#33271f',
        },
        border: {
          DEFAULT: 'rgba(246, 239, 227, 0.12)',
          strong: 'rgba(246, 239, 227, 0.28)',
          focus: '#ffc83d',
        },
        text: {
          primary: '#f6efe3',
          secondary: '#b8aa98',
          tertiary: '#8a7d6d',
        },
        accent: {
          DEFAULT: '#ffc83d',
          hover: '#e6b12e',
        },
        status: {
          green: '#5fd38d',
          red: '#ff5d5d',
          amber: '#ffb347',
        },
        mode: {
          classic: '#ffc83d',
          flashlight: '#f59e0b',
          double: '#a78bfa',
          narrator: '#6ee7b7',
        },
        // Mapped backwards-compatible colors
        'cinema-dark': '#16110e',
        'cinema-darker': '#1f1813',
        'cinema-accent': '#ffc83d',
        'cinema-accent-dark': '#e6b12e',
        'cinema-red': '#ff5d5d',
        'cinema-green': '#5fd38d',
        'cinema-gray': '#2a2019',
        'cinema-light': '#f6efe3',
      },
      borderRadius: {
        card: '24px',
        tile: '16px',
        pill: '9999px',
      },
      letterSpacing: {
        tightest: '-0.03em',
        'mono-caps': '0.14em',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      animation: {
        crossfade: 'crossfade 0.4s ease-in-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        crossfade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      aspectRatio: {
        video: '16 / 9',
      },
    },
  },
  plugins: [],
};

export default config;
