import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8e8",
          100: "#f9ecc4",
          200: "#f3d98a",
          300: "#edc450",
          400: "#e6b12a",
          500: "#D4AF37",
          600: "#b8962e",
          700: "#9a7b25",
          800: "#7c631d",
          900: "#5e4a15",
        },
        accent: {
          purple: "#7C6BBD",
          teal: "#3ABAB4",
          orange: "#E8844A",
          red: "#D94F4F",
          gold: "#D4AF37",
        },
        dark: {
          900: "#0B0E14",
          800: "#111520",
          700: "#161b28",
          600: "#1c2235",
          500: "#252d42",
          400: "#353f58",
          300: "#555E6E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
        "spin-slow": "spin 3s linear infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(212, 175, 55, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.5)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
