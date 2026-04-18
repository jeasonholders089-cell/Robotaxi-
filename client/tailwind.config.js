/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6033',
          dark: '#E55A2B',
          light: '#FFF7F5',
        },
        success: '#52C41A',
        warning: '#FAAD14',
        error: '#F5222D',
        info: '#1890FF',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D9D9D9',
          400: '#BFBFBF',
          500: '#999999',
          600: '#666666',
          700: '#333333',
          800: '#1A1A1A',
        },
      },
      fontFamily: {
        sans: ['PingFang SC', 'SF Pro Text', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      spacing: {
        'sidebar': '220px',
        'sidebar-collapsed': '64px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
