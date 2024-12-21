const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Professional color palette
        border: "#e5e7eb",  // Light gray border
        input: "#e5e7eb",   // Input border
        ring: "#2563eb",    // Focus ring color (primary blue)
        primary: {
          DEFAULT: "#2563eb",  // Vibrant blue
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#6366f1",  // Soft indigo
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#10b981",  // Emerald green
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",  // Soft red
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f3f4f6",  // Light gray
          foreground: "#6b7280",
        },
        background: "#ffffff",
        foreground: "#111827",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
