/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: '#FAF8F5',
        teal: {
          DEFAULT: '#0F4C5C',
          dark: '#0A3540',
          light: '#1A6B7F',
        },
        coral: {
          DEFAULT: '#E07A5F',
          dark: '#C45F4A',
          light: '#E89679',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'v4-sm': '0 1px 2px rgba(15, 76, 92, 0.05)',
        'v4-md': '0 4px 6px rgba(15, 76, 92, 0.08)',
        'v4-lg': '0 10px 15px rgba(15, 76, 92, 0.1)',
        'v4-xl': '0 20px 25px rgba(15, 76, 92, 0.15)',
      },
    },
  },
  plugins: [],
}
