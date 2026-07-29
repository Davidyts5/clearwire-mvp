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
        graphite: "#14161A",
        panel: "#1C1F24",
        steel: "#E4E7EB",
        slate: "#8B93A1",
        line: "#2A2E35",
        "signal-red": "#B8453A",
        "signal-green": "#2E7D5B",
        wire: "#3D7A82"
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;