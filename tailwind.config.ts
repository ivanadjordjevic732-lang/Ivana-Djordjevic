import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm cream / gold palette derived directly from the Mindéa logo
        cream: {
          50: '#fdfaf5',
          100: '#f7efe2',
          200: '#f1e4cf',
          300: '#e8ddd0',
        },
        gold: {
          DEFAULT: '#b8904a',
          deep: '#8b6432',
          light: '#d8b878',
          glow: '#f0d9a8',
        },
        ink: '#2c1f0e',
        muted: '#7a5c38',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-dmsans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        brand: '0.32em',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 1s cubic-bezier(0.16,1,0.3,1) forwards',
        shimmer: 'shimmer 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
