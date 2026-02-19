/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#256af4',
        'background-light': '#f5f6f8',
        'background-dark': '#0b0e11',
        'surface-dark': '#181c22',
        'border-dark': '#2d333b',
        'muted-dark': '#8b949e',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    },
  },
};
