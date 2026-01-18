import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Container settings
      container: {
        center: true,
        padding: "1.5rem",
        screens: {
          "2xl": "1440px",
        },
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        heading: ["Epilogue", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      colors: {
        // Student Dashboard Theme Colors
        "student-primary": "#18548b",
        "student-primary-light": "#e8f0f7",
        "student-accent": "#FF7F11",
        "student-secondary": "#8BC34A",
        "student-bg": "#f6f7f8",
        "student-surface": "#ffffff",
        "student-text": "#121417",
        "student-muted": "#657686",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Saastify-inspired admin theme colors
        admin: {
          bg: "#0A0B0F",
          surface: "#0E1016",
          panel: "rgba(255,255,255,0.04)",
          fg: "#E8ECF1",
          muted: "#A8B0BD",
          border: "rgba(255,255,255,0.12)",
          brand: "#1E8CFF",
          accent: "#9B5CFF",
          success: "#18E6C9",
          warn: "#FFC857",
          danger: "#FF6B6B",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(30, 140, 255, 0.3)",
        "glow-xl": "0 0 40px rgba(30, 140, 255, 0.4)",
        "glow-accent": "0 0 20px rgba(155, 92, 255, 0.3)",
        "glow-success": "0 0 20px rgba(24, 230, 201, 0.3)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.12)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.16)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "aurora-1": "linear-gradient(135deg, rgba(30, 140, 255, 0.15) 0%, rgba(155, 92, 255, 0.15) 50%, rgba(24, 230, 201, 0.1) 100%)",
        "aurora-2": "linear-gradient(225deg, rgba(155, 92, 255, 0.12) 0%, rgba(30, 140, 255, 0.12) 50%, rgba(255, 200, 87, 0.08) 100%)",
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "aurora-shift": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
            opacity: "0.6",
          },
          "33%": {
            transform: "translate(30px, -30px) scale(1.1)",
            opacity: "0.8",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.95)",
            opacity: "0.5",
          },
        },
        "float-gentle": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-10px) translateX(5px)" },
          "50%": { transform: "translateY(-5px) translateX(-5px)" },
          "75%": { transform: "translateY(-15px) translateX(3px)" },
        },
        "orb-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "0.4",
          },
          "50%": {
            transform: "scale(1.2)",
            opacity: "0.6",
          },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "magnetic-hover": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(30, 140, 255, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(30, 140, 255, 0.5)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        "ring-progress": {
          "0%": { strokeDashoffset: "283" },
          "100%": { strokeDashoffset: "var(--progress-offset)" },
        },
        barLoader: {
          "0%, 100%": { transform: "scaleY(0.1)", opacity: "0.2" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "aurora-shift": "aurora-shift 18s ease-in-out infinite",
        "float-gentle": "float-gentle 6s ease-in-out infinite",
        "orb-pulse": "orb-pulse 8s ease-in-out infinite",
        "gradient-x": "gradient-x 12s ease infinite",
        shimmer: "shimmer 2s linear infinite",
        "slide-up-fade": "slide-up-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        "magnetic-hover": "magnetic-hover 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "count-up": "count-up 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        "bar-grow": "bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        barLoader: "barLoader 1.2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms",
        "450": "450ms",
        "700": "700ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
