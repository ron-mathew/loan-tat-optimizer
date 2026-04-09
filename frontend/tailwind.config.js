/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      colors: {
        bg:      "#0d1117",
        surface: "#161b22",
        border:  "#30363d",
        muted:   "#8b949e",
        text:    "#e6edf3",
        blue:    "#1f6feb",
        green:   "#3fb950",
        yellow:  "#d29922",
        red:     "#f85149",
      },
    },
  },
  plugins: [],
};