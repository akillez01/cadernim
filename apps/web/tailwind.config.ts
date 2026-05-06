import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        moss: {
          50: "#f3f7f3",
          100: "#e4efe6",
          200: "#cde0d2",
          300: "#aac8b2",
          400: "#84ab92",
          500: "#648b74",
          600: "#4f6f5d",
          700: "#435a4e",
          800: "#384940",
          900: "#2f3d35"
        },
        sand: {
          50: "#fffdfa",
          100: "#fbf6ef",
          200: "#f4ebdd",
          300: "#eadcc6",
          400: "#dfc9ab",
          500: "#d2b68f",
          600: "#b38f68",
          700: "#906f52",
          800: "#735843",
          900: "#5f4838"
        }
      },
      boxShadow: {
        soft: "0 12px 35px -18px rgba(37, 50, 44, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
