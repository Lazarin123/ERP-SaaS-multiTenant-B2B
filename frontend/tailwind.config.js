/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050B1A',
          900: '#0A1A33',
          800: '#0F2247',
          700: '#16305F',
          600: '#1D3E77',
          500: '#2A5298',
        },
        gold: {
          50: '#FBF6E9',
          100: '#F5E9C8',
          200: '#EAD494',
          300: '#DEBE66',
          400: '#D4AF37', // dourado principal
          500: '#C09A2A',
          600: '#9C7C1F',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        luxury: '0 8px 30px rgba(10, 26, 51, 0.15)',
        gold: '0 0 0 1px rgba(212, 175, 55, 0.35)',
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(160deg, #0A1A33 0%, #050B1A 100%)',
      },
    },
  },
  plugins: [],
};
