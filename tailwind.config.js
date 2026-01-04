/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Liquid Glass Design System
        glass: {
          white: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          highlight: 'rgba(255, 255, 255, 0.15)',
        },
        // Semantic colors
        income: {
          DEFAULT: '#10b981', // emerald-500
          light: '#34d399',   // emerald-400
          dark: '#059669',    // emerald-600
          glow: 'rgba(16, 185, 129, 0.3)',
        },
        expense: {
          DEFAULT: '#f43f5e', // rose-500
          light: '#fb7185',   // rose-400
          dark: '#e11d48',    // rose-600
          glow: 'rgba(244, 63, 94, 0.3)',
        },
        accent: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fbbf24',   // amber-400
          dark: '#d97706',    // amber-600
          glow: 'rgba(245, 158, 11, 0.3)',
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Code',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.4)',
        'glow-income': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-expense': '0 0 20px rgba(244, 63, 94, 0.4)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(16, 185, 129, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(245, 158, 11, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(244, 63, 94, 0.1) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}

