/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f2f6f3',
          100: '#e0eae2',
          200: '#c2d5c6',
          300: '#9ab8a0',
          400: '#6B8F72',
          500: '#5c7d63',
          600: '#4a6650',
          700: '#3d5442',
          800: '#334639',
          900: '#2b3a30',
        }
      }
    },
  },
  plugins: [],
}
