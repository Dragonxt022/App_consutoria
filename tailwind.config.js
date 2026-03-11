/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./src/views/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta primária: 3 tons de laranja
        primary: {
          100: '#FFF3E6',
          500: '#FF7A00',
          700: '#CC4A00'
        },
        // Mapear tokens existentes para os tons laranja para reaproveitar classes
        indigo: {
          50: '#FFF3E6',
          100: '#FFF3E6',
          200: '#FFF3E6',
          300: '#FF7A00',
          400: '#FF7A00',
          500: '#FF7A00',
          600: '#CC4A00',
          700: '#CC4A00',
          800: '#CC4A00',
          900: '#CC4A00'
        },
        amber: {
          50: '#FFF3E6',
          100: '#FFF3E6',
          200: '#FFF3E6',
          500: '#FF7A00',
          600: '#CC4A00',
          700: '#CC4A00'
        },
        emerald: {
          50: '#FFF3E6',
          100: '#FFF3E6',
          200: '#FFF3E6',
          400: '#FF7A00',
          500: '#FF7A00',
          600: '#CC4A00'
        },
        green: {
          50: '#FFF3E6',
          100: '#FFF3E6',
          400: '#FF7A00',
          500: '#FF7A00',
          600: '#CC4A00'
        }
      }
    }
  },
  plugins: []
}