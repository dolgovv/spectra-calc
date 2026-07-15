import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0b0f',
        surface: '#12141c',
        'surface-2': '#171a24',
        border: {
          DEFAULT: '#242833',
          strong: '#2f3341',
        },
        accent: {
          DEFAULT: '#2fe6b0',
          foreground: '#06110d',
        },
        foreground: '#f5f7fa',
        muted: '#8b93a7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
