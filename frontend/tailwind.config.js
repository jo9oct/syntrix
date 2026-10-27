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
          light: '#60a5fa',     // Blue 400
          DEFAULT: '#3b82f6',   // Blue 500
          dark: '#1d4ed8',      // Blue 700
          purple: '#a855f7',    // Purple 500
          magenta: '#ec4899',   // Pink 500
          cyan: '#06b6d4',      // Cyan 500
          'cyan-light': '#22d3ee', // Cyan 400
          'cyan-dim': '#0891b2',   // Cyan 600
          navy: '#0c1628',         // Deep navy accent
        },
        background: {
          DEFAULT: '#0d1526',   // Deep navy 900
          darker: '#060d1a',    // Near-black navy
          lighter: '#162035',   // Navy 800 surface
          card: '#0f1c30',      // Card-level navy
        },
        surface: {
          DEFAULT: 'rgba(13, 24, 48, 0.7)',  // Navy glass surface
          solid: '#162035',
          elevated: 'rgba(22, 34, 58, 0.8)', // Elevated surface
        },
        text: {
          DEFAULT: '#f0f6ff',   // Off-white (cooler)
          muted: '#7a9abf',     // Blue-tinted muted
          subtle: '#4a6480',    // Very muted
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
        'gradient-brand': 'linear-gradient(135deg, #3b82f6 0%, #a855f7 55%, #ec4899 100%)',
        'gradient-brand-cool': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 60%, #a855f7 100%)',
        'gradient-glow': 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(2, 6, 23, 0) 70%)',
        'gradient-glow-cyan': 'radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, transparent 65%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(13,24,48,0) 0%, rgba(6,13,26,1) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(22,32,53,0.9) 0%, rgba(13,24,48,0.7) 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 40px -10px rgba(6, 182, 212, 0.4)',
        'glow-purple': '0 0 40px -10px rgba(168, 85, 247, 0.3)',
        'glow-brand': '0 0 60px -15px rgba(59, 130, 246, 0.35)',
        'card': '0 4px 32px -4px rgba(0,0,0,0.6), 0 2px 8px -2px rgba(0,0,0,0.4)',
        'card-hover': '0 12px 48px -8px rgba(0,0,0,0.7), 0 4px 16px -4px rgba(6,182,212,0.15)',
        'nav': '0 8px 32px -4px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
