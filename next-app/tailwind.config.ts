import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F6F1E8',
          soft:    '#FBF6EC',
          deep:    '#EFE5D2',
          shadow:  '#E5DAC3',
        },
        ink:    '#1A1410',
        muted:  '#7A6D54',
        gold: {
          DEFAULT: '#C8A96A',
          light:   '#E5C988',
          dark:    '#8A7044',
        },
        taupe:  '#A68F72',
        line:   'rgba(138, 110, 60, 0.18)',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'Times New Roman', 'serif'],
        sans:  ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'ease-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
