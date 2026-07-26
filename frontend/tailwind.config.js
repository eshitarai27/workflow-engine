/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // FlowForge's palette: warm, dark-first, industrial. Deliberately
        // not the cool blue/light-first ExplainHTTP palette this dashboard
        // started life resembling.
        surface: { DEFAULT: "#ffffff", dark: "#1c1a15" },
        plane: { DEFAULT: "#fbf8f2", dark: "#15130f" },
        ink: { DEFAULT: "#1a1611", dark: "#f5f1ea" },
        "ink-muted": { DEFAULT: "#6b5f4d", dark: "#b8ab97" },
        "ink-faint": "#8f8270",
        hairline: { DEFAULT: "#e4dcc9", dark: "#332c22" },
        baseline: { DEFAULT: "#cfc2a8", dark: "#4a4030" },
        forge: {
          1: "#e8722c", // ember (primary accent)
          2: "#4c7a96", // steel
          3: "#c9a13b", // brass
          4: "#5c8a5c", // moss
          5: "#8b5a8f", // plum
          6: "#5b6bab", // indigo
          7: "#7a7568", // slate
          8: "#a8503f", // rust
        },
        status: {
          good: "#4a9d4f",
          warning: "#d4a017",
          serious: "#d97a4d",
          critical: "#c1443a",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
