const plugin = require('tailwindcss/plugin')
const forms = require('@tailwindcss/forms')

// Roots that carry the forms base layer. Host documents opt in with admin-forms-root.
const FORMS_ROOTS = ['.admin-theme-root', '.site-shell', '.admin-forms-root']

const scopedForms = plugin((api) => {
  const captured = []
  forms({ strategy: 'base' }).handler({
    ...api,
    addBase: (rules) => captured.push(...[].concat(rules)),
    addComponents: () => {},
  })
  const prefix = `:where(${FORMS_ROOTS.join(', ')}) `
  api.addBase(
    captured.map((rule) =>
      Object.fromEntries(
        Object.entries(rule).map(([selector, styles]) => [
          selector.split(',').map((part) => prefix + part.trim()).join(','),
          styles,
        ]),
      ),
    ),
  )
})

/** @type {import('tailwindcss').Config} */
module.exports = {
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
    scopedForms,
  ],
}
