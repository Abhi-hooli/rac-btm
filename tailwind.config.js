/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rotary: {
          blue: '#d41367',
          'blue-dark': '#a80f52',
          'blue-light': '#e84488',
          gold: '#f7a81b',
          'gold-light': '#ffc04d',
          royal: '#17458f',
          azure: '#0067c8',
          navy: '#1a1a2e',
          'navy-light': '#252545',
          charcoal: '#54565a',
          slate: '#657f99',
          silver: '#d0cfcd',
          cloud: '#f5f5f7',
        }
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    }
  },
  plugins: []
}