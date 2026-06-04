import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-void)",
        foreground: "var(--text-white)",
        muted: "var(--text-secondary)",
        panel: "var(--bg-panel)",
        line: "var(--border-base)",
        accent: "var(--green)",
        positive: "var(--path-bull)",
        warning: "var(--path-bear)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "Space Mono", "monospace"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0,0,0,0.24)"
      }
    }
  },
  plugins: []
};

export default config;
