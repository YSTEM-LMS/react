/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: "#7FCC26",
        secondary: "#BFD99E",
        soft: "#E5F3D2",
        accent: "#EAD94C",

        // Neutrals
        dark: "#1F1F1F",
        gray: "#5C5C5C",
        muted: "#8A8A8A",
        borderLight: "#D6D6D6",
        light: "#F9FAF7",

        // Error colors
        red: "#D64545",
        redLight: "#F5E9E9",
      },

      fontFamily: {
        sans: [
          "Lato",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      
      boxShadow: {
        'card-yellow': '1.25rem 1.25rem 0.063rem rgb(209, 230, 28)',
        'card-green': '1.25rem 1.25rem 0.063rem rgb(115, 179, 19)',
      },

      keyframes: {
        'modal-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1)   translateY(0)'    },
        },
        'fade-out': {
          'to': { opacity: '0', transform: 'translateY(-5px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'typing-dots': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'gentle-breathe': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'happy-bounce': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-12px) scale(1.02)' },
        },
        'thinking-eyes': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px) translateX(1px)' },
        },
        'thought-dot': {
          'from': { transform: 'scale(0.5)', opacity: '0.3' },
          'to': { transform: 'scale(1.1)', opacity: '1' },
        },
        'mouth-talk': {
          'from': { transform: 'scaleY(0.3)' },
          'to': { transform: 'scaleY(1.3)' },
        },
        'rotate-sparkles': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        'hand-wave': {
          'from': { transform: 'rotate(-5deg)' },
          'to': { transform: 'rotate(15deg)' },
        },
        'confetti-fall': {
          'to': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
      },
      animation: {
        'modal-in': 'modal-in 0.15s ease-out',
        'fade-out': 'fade-out 0.4s ease 2.1s forwards',
        'shake': 'shake 0.5s ease',
        'typing-dots': 'typing-dots 1.4s infinite ease-in-out both',
        'gentle-breathe-2': 'gentle-breathe 2s ease-in-out infinite',
        'gentle-breathe-3': 'gentle-breathe 3s ease-in-out infinite',
        'gentle-breathe-4': 'gentle-breathe 4s ease-in-out infinite',
        'happy-bounce': 'happy-bounce 0.6s ease infinite alternate',
        'thinking-eyes': 'thinking-eyes 3s ease-in-out infinite',
        'thought-dot-1': 'thought-dot 1.2s 0.2s infinite alternate',
        'thought-dot-2': 'thought-dot 1.2s 0.4s infinite alternate',
        'thought-dot-3': 'thought-dot 1.2s 0.6s infinite alternate',
        'mouth-talk': 'mouth-talk 0.4s ease-in-out infinite alternate',
        'rotate-sparkles': 'rotate-sparkles 4s linear infinite',
        'hand-wave': 'hand-wave 0.8s ease-in-out infinite alternate',
        'confetti-fall': 'confetti-fall 3s linear forwards',
      },
    },
  },
  plugins: [],
}
