import type { Config } from "tailwindcss";

// Helios design system (Section 10).
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#15233B",
          50: "#f3f5f9",
          100: "#e2e7f0",
          700: "#1f3354",
          800: "#15233B",
          900: "#0e1828",
        },
        teal: {
          DEFAULT: "#14735C",
          50: "#eef7f4",
          500: "#14735C",
          600: "#0f5d4a",
        },
        amber: {
          DEFAULT: "#B07D1E",
          50: "#faf4e6",
          500: "#B07D1E",
          600: "#8f6418",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
