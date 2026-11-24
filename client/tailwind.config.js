/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens for dark navy theme
        bg: {
          primary: '#050912',
          secondary: '#080E19',
          card: '#0B1322',
          'card-hover': '#101C30',
          input: '#080F1D',
        },
        border: {
          primary: '#14243A',
          active: '#0877FF',
        },
        accent: {
          primary: '#087CFF',
          secondary: '#00A6FF',
          glow: '#087CFF',
        },
        text: {
          primary: '#F1F5FC',
          secondary: '#8B9AB2',
          muted: '#58677E',
        },
        success: '#00D6A0',
        warning: '#FFB547',
        danger: '#FF465C',
        chart: {
          blue: '#087CFF',
          cyan: '#00C8FF',
        },
        video: {
          panel: '#0F172A',
          panel-hover: '#1E293B',
        },
        recording: {
          dot: '#EF4444',
        },
        // Semantic aliases for easier usage
        'sidebar-bg': '#080E19',
        'card-bg': '#0B1322',
        'card-hover': '#101C30',
        'input-bg': '#080F1D',
        'border-default': '#14243A',
        'border-focus': '#0877FF',
        'accent-blue': '#087CFF',
        'accent-cyan': '#00A6FF',
        'text-main': '#F1F5FC',
        'text-dim': '#8B9AB2',
        'text-muted': '#58677E',
        'status-success': '#00D6A0',
        'status-warning': '#FFB547',
        'status-danger': '#FF465C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #087CFF, 0 0 10px #087CFF' },
          '100%': { boxShadow: '0 0 15px #087CFF, 0 0 30px #087CFF, 0 0 45px #087CFF' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(8, 124, 255, 0.3)',
        'glow-md': '0 0 20px rgba(8, 124, 255, 0.4), 0 0 40px rgba(8, 124, 255, 0.2)',
        'glow-lg': '0 0 30px rgba(8, 124, 255, 0.5), 0 0 60px rgba(8, 124, 255, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(8, 124, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 40% 20%, hsla(210, 100%, 50%, 0.15) 0px, transparent 50%), radial-gradient(at 80% 80%, hsla(190, 100%, 50%, 0.1) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}