/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f7fb',
          100: '#cceff7',
          200: '#99dfef',
          300: '#66cfe7',
          400: '#33bfdf',
          500: '#00afd7',
          600: '#008cac',
          700: '#006981',
          800: '#004656',
          900: '#00232b',
        },
        kite: {
          orange: '#f97316',
          teal: '#14b8a6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
