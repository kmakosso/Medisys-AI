import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Portail patient — MedisysAI (bleu vif)
        patient: {
          DEFAULT: "#1a73e8",
          50: "#e8f0fe",
          100: "#d2e3fc",
          500: "#1a73e8",
          600: "#1765cc",
          700: "#1457ad",
        },
        // Portail médecin — MedisysAI Pro (bleu nuit médical)
        pro: {
          DEFAULT: "#0a3d6b",
          accent: "#00b4d8",
          sidebar: "#0d2137",
          card: "#1a2e44",
          night: "#0a3d6b",
        },
        success: "#34a853",
        danger: "#ea4335",
        warning: "#f9ab00",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        pop: "pop 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
