/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', dark: '#3730A3', light: '#818CF8' },
        accent:  { DEFAULT: '#F59E0B', dark: '#D97706', light: '#FEF3C7' },
        success: { DEFAULT: '#10B981', dark: '#15803D', light: '#DCFCE7' },
        danger:  { DEFAULT: '#EF4444', dark: '#DC2626', light: '#FEE2E2' },
        warn:    { DEFAULT: '#F59E0B', dark: '#D97706', light: '#FFFBEB' },
        info:    { DEFAULT: '#3B82F6', dark: '#2563EB', light: '#EFF6FF' },
        surface: { DEFAULT: '#F8FAFC', alt: '#F3F4F6' },
        sidebar: '#0F172A',
        muted:   '#6B7280',
        border:  '#E5E7EB',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,.05)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
        'elevated': '0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -4px rgba(0,0,0,.03)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
