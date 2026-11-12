/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f7fb",
          100: "#e7eef7",
          200: "#cad9ec",
          300: "#9db9d9",
          400: "#6894c2",
          500: "#4676a9",
          600: "#345d8c",
          700: "#2b4b72",
          800: "#28405f",
          900: "#253750",
          950: "#0b1220",
        },
        signal: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#ffdba8",
          300: "#ffc170",
          400: "#ff9d37",
          500: "#ff7f11",
          600: "#f06207",
          700: "#c74908",
          800: "#9e3a0f",
          900: "#7f3210",
          950: "#451706",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -16px rgba(15, 23, 42, 0.18)",
        lift: "0 24px 60px -24px rgba(11, 18, 32, 0.35)",
        glow: "0 0 0 1px rgba(255, 127, 17, 0.25), 0 16px 40px -16px rgba(255, 127, 17, 0.45)",
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-soft": "pulse-soft 2.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};
