/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Institucional Universidad Católica de Temuco (UCT)
        primary: {
          DEFAULT: '#003366', // Azul Institucional UCT Principal
          50: '#f0f5fa',
          100: '#e0ecf6',
          200: '#b8d4ed',
          300: '#8ab6e2',
          400: '#4d8ed1',
          500: '#1d6bb8',
          600: '#00509d',   // Azul vibrante de realce / acción
          700: '#003e7e',   // Azul corporativo intermedio
          800: '#003366',   // Azul marino oficial UCT
          900: '#00254d',   // Azul profundo de contraste
          950: '#001630',
          hover: '#00254d',
          active: '#001936',
          light: '#f0f5fa',
          dark: '#001e3d',
        },
        secondary: {
          DEFAULT: '#d97706', // Ámbar / Dorado Institucional UCT
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',   // Ámbar vibrante institucional
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          hover: '#b45309',
          active: '#92400e',
          light: '#fffbeb',
          dark: '#78350f',
        },
      },
      borderRadius: {
        // Unificación estricta de radios según directriz de diseño
        DEFAULT: '0.5rem', // rounded-lg
        sm: '0.5rem',      // normalizado a rounded-lg
        md: '0.5rem',      // normalizado a rounded-lg
        lg: '0.5rem',      // 8px estándar
        xl: '0.75rem',     // 12px estándar
        '2xl': '0.75rem',  // unificado hacia xl para evitar bordes desmesurados
        '3xl': '0.75rem',  // unificado hacia xl
      },
    },
  },
  plugins: [],
}
