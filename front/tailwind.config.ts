import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Page background ("paper") and the two surfaces layered on it. */
        background: '#0A0A0C',
        surface: '#131316',
        'surface-2': '#1C1C21',
        /** Near-black well used behind the mono text output. */
        console: '#08080A',
        border: {
          DEFAULT: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.22)',
        },
        accent: {
          DEFAULT: '#E8567F',
          hover: '#F16C95',
          dim: 'rgba(232,86,127,0.18)',
          foreground: '#FFFFFF',
        },
        green: {
          DEFAULT: '#3FBE93',
          dim: 'rgba(63,190,147,0.16)',
        },
        /** "Ink" text ramp: foreground → muted → muted-faint. */
        foreground: '#F3F1EC',
        muted: {
          DEFAULT: '#B0AEA8',
          faint: '#726F6A',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        panel: '10px',
        mark: '5px',
      },
      backgroundImage: {
        /** Film-grain overlay laid over the page and every panel. */
        noise:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        /** Intensity colour ramp, low → high. Mirrors HEATMAP_STOPS in lib/heatmapPalette.ts. */
        colorbar:
          'linear-gradient(to top, #1C1C21 0%, #2E7B67 28%, #C96A3B 55%, #C9487E 80%, #F0729A 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
