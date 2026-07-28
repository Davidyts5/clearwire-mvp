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
        primary: "#0f172a",
        accent: "#3b82f6",
        ink: "#1B1A17",
        panel: "#23221E",
        parchment: "#EDE8DE",
        muted: "#A8A296",
        wax: "#A63A2E",
        verified: "#4E7A64",
        brass: "#B08D57"
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;