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
        background: {
          primary: "#0A0A0A",
          secondary: "#141414",
          tertiary: "#1A1A1A",
        },
        text: {
          primary: "#F0F0F0",
          secondary: "#A0A0A0",
          tertiary: "#606060",
        },
        border: {
          primary: "#2A2A2A",
          secondary: "#222222",
        },
        modules: {
          track: "#7F77DD",
          annotate: "#1D9E75",
          knowledge: "#378ADD",
          deliver: "#D85A30",
          automate: "#BA7517",
          aly: "#BA7517",
        },
        status: {
          urgent: "#E24B4A",
          high: "#EF9F27",
          low: "#639922",
          success: "#1D9E75",
          info: "#378ADD",
        },
      },
    },
  },
  plugins: [],
};
export default config;
