/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral, near-monochrome base -- the palette does almost no work.
        // Hierarchy comes from type/spacing; color is reserved for meaning.
        plane: { DEFAULT: "#fafafa", dark: "#09090b" },
        surface: { DEFAULT: "#ffffff", dark: "#111113" },
        "surface-raised": { DEFAULT: "#ffffff", dark: "#18181b" },
        ink: { DEFAULT: "#18181b", dark: "#f4f4f5" },
        "ink-muted": { DEFAULT: "#71717a", dark: "#a1a1aa" },
        "ink-faint": { DEFAULT: "#a1a1aa", dark: "#5f5f66" },
        hairline: { DEFAULT: "#e4e4e7", dark: "#232327" },
        baseline: { DEFAULT: "#d4d4d8", dark: "#38383e" },

        // Single brand accent -- used only for primary actions, active
        // nav/tab state, focus rings, and the "running" execution state.
        // Never decorative, never a background fill on its own.
        accent: { DEFAULT: "#c2620a", dark: "#f0a020" },
        "accent-muted": { DEFAULT: "#fef3e6", dark: "#2a1d0d" },

        status: {
          success: { DEFAULT: "#15803d", dark: "#4ade80" },
          warning: { DEFAULT: "#a16207", dark: "#facc15" },
          danger: { DEFAULT: "#b91c1c", dark: "#f87171" },
          info: { DEFAULT: "#1d4ed8", dark: "#60a5fa" },
          neutral: { DEFAULT: "#71717a", dark: "#a1a1aa" },
        },

        // Category identity colors -- for plugin/node kind, never for state.
        category: {
          network: { DEFAULT: "#c2620a", dark: "#f0a020" },
          compute: { DEFAULT: "#1d4ed8", dark: "#60a5fa" },
          data: { DEFAULT: "#7c3aed", dark: "#a78bfa" },
          storage: { DEFAULT: "#15803d", dark: "#4ade80" },
          notification: { DEFAULT: "#be185d", dark: "#f472b6" },
          ai: { DEFAULT: "#0f766e", dark: "#2dd4bf" },
          general: { DEFAULT: "#52525b", dark: "#a1a1aa" },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["13px", { lineHeight: "20px" }],
        md: ["14px", { lineHeight: "21px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["19px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        "2xl": ["24px", { lineHeight: "30px", letterSpacing: "-0.015em" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        panel: "0 4px 16px -4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
        "panel-dark": "0 4px 20px -4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(240,160,32,0.35)" },
          "50%": { boxShadow: "0 0 0 4px rgba(240,160,32,0)" },
        },
        "dash-flow": {
          to: { strokeDashoffset: -20 },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(2px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.97)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s ease-in-out infinite",
        "dash-flow": "dash-flow 0.6s linear infinite",
        "fade-in": "fade-in 0.12s ease-out",
        "scale-in": "scale-in 0.12s ease-out",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      transitionDuration: {
        150: "150ms",
      },
    },
  },
  plugins: [],
};
