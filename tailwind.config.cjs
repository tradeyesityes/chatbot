/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        salla: {
          primary: '#004D5A',
          accent: '#BAF3E6',
          'accent-light': '#CFF7EE',
          text: '#444444',
          muted: '#999999',
          bg: '#FFFFFF',
          'bg-soft': '#f8fafc',
        }
      },
      borderRadius: {
        'salla': '12px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
