import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080C14",
        surface: "#0F1923",
        card: "#141E2B",
        border: "#1E2D3D",
        primary: "#2C7BE5",
        "primary-hover": "#1E6DD4",
        "text-body": "#94A3B8",
        "text-muted": "#475569",
        severity: {
          critical: "#F43F5E",
          high: "#FB923C",
          medium: "#FBBF24",
          low: "#38BDF8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
