/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'olympus-dark': '#0d0208',
        'olympus-purple': '#3d1e4f',
        'olympus-blood': '#dc2626',
        'olympus-gold': '#d4af37',
      },
    },
  },
  plugins: [],
}
