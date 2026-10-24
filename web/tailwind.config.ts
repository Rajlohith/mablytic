import type { Config } from "tailwindcss";

// Design tokens for the Mablytic editorial system. Colors are deliberately
// restrained: black ink on white, thin rules, one accent for links/focus.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        body: "#2b2b2b",
        muted: "#5a5a5a",
        rule: "#dfdfdf",
        paper: "#ffffff",
        wash: "#f4f5f7", // quiet background for ads and panels
        accent: "#1a4f8b",
        danger: "#b3261e",
        ok: "#1e6b3a",
      },
      fontFamily: {
        headline: ['"Libre Caslon Text"', "Georgia", "Times New Roman", "serif"],
        serif: ['"Source Serif 4 Variable"', "Georgia", "Times New Roman", "serif"],
        sans: ['"Libre Franklin Variable"', "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        // [size, lineHeight] — a deliberate scale instead of ad-hoc values
        meta: ["0.75rem", "1rem"],
        small: ["0.875rem", "1.25rem"],
        deck: ["1.0625rem", "1.55rem"],
        article: ["1.25rem", "2rem"],
      },
      maxWidth: { page: "1280px", reading: "680px" },
      screens: { xs: "480px" },
    },
  },
  plugins: [],
} satisfies Config;
