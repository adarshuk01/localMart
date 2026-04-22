/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50:'#f0fdf9',100:'#ccfbef',200:'#99f6e0',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a',950:'#042f2e' },
        navy:    { 800:'#171433',900:'#0f0d23',950:'#08071a' },
      },
      fontFamily: {
        display: ['Sora','sans-serif'],
        body:    ['DM Sans','sans-serif'],
      },
      boxShadow: {
        card:   '0 2px 16px 0 rgba(15,13,35,0.07)',
        glow:   '0 0 24px 0 rgba(20,184,166,0.25)',
      },
      animation: {
        'fade-in':  'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'spin-slow':'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from:{opacity:'0'},           to:{opacity:'1'} },
        slideUp: { from:{opacity:'0',transform:'translateY(14px)'}, to:{opacity:'1',transform:'translateY(0)'} },
      },
    },
  },
  plugins: [],
}
