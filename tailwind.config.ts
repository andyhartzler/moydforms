import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        // Fraunces — editorial serif reserved for form titles and hero
        // moments. Keep sans for body and all field labels so the forms
        // stay clean and readable.
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // MOYD brand palette (canonical — added 2026-04-23).
        // unityBlue is the deep navy used on moyoungdemocrats.org body bg,
        // sunriseGold the highlight, momentumBlue the bright accent,
        // slateBlue a mid tone for rails/borders.
        moyd: {
          unity: '#273351',
          sunrise: '#FDB813',
          momentum: '#32A6DE',
          slate: '#5A7FA3',
        },
        primary: {
          DEFAULT: '#0b4db8',
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd4ff',
          300: '#8eb8ff',
          400: '#5990ff',
          500: '#3368ff',
          600: '#0b4db8',
          700: '#0a3d94',
          800: '#0b1e37',
          900: '#091a2f',
        },
        gold: {
          DEFAULT: '#d4a039',
          50: '#fdf8eb',
          100: '#faedc6',
          200: '#f5d88a',
          300: '#f0c04e',
          400: '#d4a039',
          500: '#c48c20',
          600: '#a16b18',
          700: '#7d4f17',
          800: '#693f1a',
          900: '#5a351c',
        },
        dark: '#0b1e37',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        glow: '0 0 20px rgba(11, 77, 184, 0.15)',
        'glow-gold': '0 0 20px rgba(212, 160, 57, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
