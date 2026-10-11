import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#315741",
        accent: "#58745f",
        // Reuse the landing page's warm neutral and forest palette throughout the app.
        slate: {
          50: "#f5f4ee",
          100: "#eeeee6",
          200: "#e3e2d9",
          300: "#d5d6cc",
          400: "#9ba398",
          500: "#768076",
          600: "#59665d",
          700: "#405046",
          800: "#2e3e33",
          900: "#203329",
          950: "#16261e",
        },
        blue: {
          50: "#eff3ed",
          100: "#dce7dd",
          200: "#c4d5c4",
          300: "#a9c2a9",
          400: "#839c82",
          500: "#66896a",
          600: "#315741",
          700: "#254733",
          800: "#203a2b",
          900: "#192f23",
          950: "#12251b",
        },
        emerald: {
          50: "#eff3ed",
          100: "#dce7dd",
          200: "#c4d5c4",
          300: "#a9c2a9",
          400: "#83a282",
          500: "#66896a",
          600: "#507452",
          700: "#3f6245",
          800: "#314e37",
          900: "#263f2c",
          950: "#182d1e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
