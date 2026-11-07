/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-card': 'rgb(var(--color-surface-card) / <alpha-value>)',
        'surface-border': 'rgb(var(--color-surface-border) / <alpha-value>)',
        'brand-primary': '#6366F1', // indigo
        'brand-accent': '#8B5CF6',  // violet
        'brand-cyan': '#06B6D4',
        'brand-emerald': '#10B981',
        'brand-rose': '#F43F5E',
        'brand-amber': '#F59E0B'
      }
    },
  },
  plugins: [],
}
