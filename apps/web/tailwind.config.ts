import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(0 0% 100%)",
        fg: "hsl(222 47% 11%)",
        muted: "hsl(210 40% 96%)",
        "muted-fg": "hsl(215 16% 47%)",
        border: "hsl(214 32% 91%)",
        accent: "hsl(221 83% 53%)",
        "accent-fg": "hsl(0 0% 100%)",
        danger: "hsl(0 72% 51%)",
        success: "hsl(142 71% 45%)",
        warning: "hsl(38 92% 50%)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
