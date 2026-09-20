import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0a0d3a",
        primary: {
          DEFAULT: "#5865f2",
          hover: "#4752c4",
          active: "#3c45a5",
        },
        green: {
          DEFAULT: "#35ed7e",
          hover: "#2ecc71",
        },
        magenta: {
          DEFAULT: "#ec48bd",
          hover: "#d838aa",
        },
        link: "#00b0f4",
        surface: {
          indigo: "#1e2353",
          indigoSoft: "#151940",
          onyx: "#23272a",
          black: "#000000",
          hover: "#272d69",
        },
        ink: {
          DEFAULT: "#ffffff",
          dark: "#000000",
          muted: "#949ba4",
          subtle: "#4e5058",
        },
        hairline: "#2b3068",
      },
      borderRadius: {
        xs: "6px",
        sm: "12px",
        md: "14px",
        lg: "16px",
        xl: "40px",
        pill: "50px",
        jumbo: "120px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 4px 40px rgba(88, 101, 242, 0.25)",
        card: "0 8px 32px rgba(0, 0, 0, 0.36)",
        float: "0 12px 48px rgba(10, 13, 58, 0.6)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        pulseSlow: "pulseSlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
