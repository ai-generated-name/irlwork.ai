/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: '#FAFAF8',
        teal: {
          DEFAULT: '#E8853D',
          dark: '#D4703A',
          light: '#FFF3EB',
        },
        coral: {
          DEFAULT: '#E8853D',
          dark: '#D4703A',
          light: '#FFF3EB',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['DM Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'v4-sm': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'v4-md': '0 1px 4px rgba(0, 0, 0, 0.02), 0 8px 40px rgba(0, 0, 0, 0.035)',
        'v4-lg': '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'v4-xl': '0 16px 48px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
