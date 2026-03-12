/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#e6fdf8",
          100: "#b3f7ec",
          200: "#80f1e0",
          300: "#4debd4",
          400: "#26e4c9",
          500: "#00C9A7",
          600: "#00b396",
          700: "#009980",
          800: "#007d68",
          900: "#005c4c",
        },
        secondary: {
          50:  "#f0ebff",
          100: "#d4c8fe",
          200: "#b8a4fd",
          300: "#9c80fc",
          400: "#8b6af9",
          500: "#845EF7",
          600: "#7552de",
          700: "#6244c4",
          800: "#4f37aa",
          900: "#39267f",
        },
      },
    },
  },
  plugins: [],
}

