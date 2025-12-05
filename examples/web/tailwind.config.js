/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          dark: '#1a1d29',
          darker: '#0f1117',
          light: '#2d3142',
          accent: '#3b82f6',
          'accent-light': '#60a5fa',
        },
        sidebar: {
          bg: '#1C1C1E',
          'bg-hover': '#2C2C2E',
          'bg-active': '#3A3A3C',
          border: '#38383A',
          text: '#F5F5F7',
          'text-muted': '#98989D',
          'text-dimmed': '#636366',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
