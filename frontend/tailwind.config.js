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
          light: '#60a5fa', // Blue 400
          DEFAULT: '#3b82f6', // Blue 500
          dark: '#1d4ed8', // Blue 700
          purple: '#a855f7', // Purple 500
          magenta: '#ec4899', // Pink 500
          cyan: '#06b6d4', // Cyan 500
        },
        background: {
          DEFAULT: '#0f172a', // Slate 900
          darker: '#020617', // Slate 950
          lighter: '#1e293b', // Slate 800
        },
        surface: {
          DEFAULT: 'rgba(30, 41, 59, 0.6)', // Glass surface
          solid: '#1e293b',
        },
        text: {
          DEFAULT: '#f8fafc', // Slate 50
          muted: '#94a3b8', // Slate 400
        },
        status: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
          info: '#64748b'
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)',
        'gradient-glow': 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(2, 6, 23, 0) 70%)',
      }
    },
  },
  plugins: [],
}
