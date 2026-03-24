/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chili: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#D97706',
        }
      }
    },
  },
  plugins: [],
}
