/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        panelAppear: {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)',
          },
        },
        slideDown: {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(120%) scale(0.9)',
          },
        },
        slideUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(120%) scale(0.9)',
          },
          '50%': {
            opacity: '0.5',
            transform: 'translateY(60%) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        float: 'float 3s ease-in-out infinite',
        'panel-appear': 'panelAppear 0.2s ease-out',
        'slide-down': 'slideDown 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      zIndex: {
        'base': '0',
        'deco': '10',
        'panel': '20',
        'floating': '30',
        'nav': '40',
        'modal': '50',
        'toast': '60',
        'max': '9999',
      },
    },
  },
  plugins: [],
}