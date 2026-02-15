/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8eaff',
          600: '#0b5ed7',
          700: '#0849a8'
        }
      }
    }
  },
  plugins: []
};
