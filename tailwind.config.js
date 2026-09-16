/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0d0d0d',
          surface: '#141414',
          card: '#1a1a1a',
          cardMuted: 'rgba(23, 23, 23, 0.6)',
          border: '#262626',
          borderMuted: '#1f1f1f',
          yellow: '#facc15',
          yellowLight: '#fde047',
          yellowDark: '#ca8a04',
          text: '#f3f4f6',
          textMuted: '#9ca3af',
        }
      },
      boxShadow: {
        'yellow-glow': '0 0 28px rgba(250, 204, 21, 0.18)',
        'yellow-glow-lg': '0 0 40px rgba(250, 204, 21, 0.25)',
        'yellow-subtle': '0 0 16px rgba(250, 204, 21, 0.08)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        fadeIn: 'fadeIn 0.25s ease-out forwards',
      }
    },
  },
  plugins: [],
}
