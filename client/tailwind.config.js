/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stage: {
          bg: '#0d1117',
          surface: '#161b22',
          card: '#21262d',
          border: '#30363d',
        },
      },
    },
  },
  plugins: [],
}

