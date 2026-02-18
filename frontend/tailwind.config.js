/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'olympus-dark': '#0b0c10',
        'olympus-blood': '#d90429',
        'olympus-purple': '#7209b7',
        'olympus-gold': '#ffba08'
      }
    },
  },
  plugins: [],
}
