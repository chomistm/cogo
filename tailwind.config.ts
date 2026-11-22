import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0E1B2C",
        navy2: "#1B2D44",
        ink: "#0E1B2C",
        surface: "#F2F6F7",
        line: "#DCE5E9",
        muted: "#5D6E7E",
        brand: "#12C98A",
        brandDark: "#0A8F62",
        teal: "#19B5C9",
        amber: "#F5A524",
        danger: "#D64545",
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: { app: "440px" },
      boxShadow: { card: "0 1px 2px rgba(14,27,44,.04), 0 8px 24px -12px rgba(14,27,44,.12)" },
    },
  },
  plugins: [],
} satisfies Config;
