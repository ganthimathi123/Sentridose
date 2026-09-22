/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scientific: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        sentri: {
          blue: '#0f4c81',       // Deep Industrial Blue
          sky: '#0284c7',        // Primary Blue Accent
          teal: '#0d9488',       // Scientific Teal Accent
          amber: '#d97706',      // Warning Amber
          green: '#15803d',      // Success Green
          red: '#b91c1c',        // High Exposure Red
        }
      }
    },
  },
  plugins: [],
}
