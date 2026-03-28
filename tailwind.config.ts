import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#F7F4EF",
        surface: "#FDFBF7",
        card: "#FFFFFF",
        border: "#E8E0D5",
        primary: "#7BB8D4",
        "primary-dark": "#5A9BB8",
        "primary-light": "#A8D4E8",
        "primary-bg": "#F0F8FC",
        "text-primary": "#1C1917",
        "text-secondary": "#78716C",
        "text-muted": "#A8A29E",
        severity: {
          critical: "#E05252",
          high: "#D97B3A",
          medium: "#C4A020",
          low: "#5A9BB8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        warm: "0 1px 3px rgba(120,100,80,0.06), 0 4px 16px rgba(120,100,80,0.04)",
        "warm-lg": "0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)",
        "primary-glow": "0 0 24px rgba(123,184,212,0.25)",
        "primary-btn": "0 4px 20px rgba(123,184,212,0.4)",
        "blue-card": "0 0 0 1px rgba(123,184,212,0.1) inset, 0 4px 20px rgba(123,184,212,0.12)",
        "inset-warm": "inset 0 2px 8px rgba(120,100,80,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
