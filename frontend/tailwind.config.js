/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', dark: '#3730A3', light: '#818CF8' },
        accent:  { DEFAULT: '#F59E0B', dark: '#D97706' },
        success: '#10B981',
        surface: '#F8FAFC',
        sidebar: '#1E1B4B',
      },
    },
  },
  plugins: [],
}
