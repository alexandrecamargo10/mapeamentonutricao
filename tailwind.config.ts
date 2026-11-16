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
        pedro: {
          50: "#fff8eb",
          100: "#feeed1",
          200: "#fdda9f",
          300: "#fcc06d",
          400: "#fa9d3b",
          500: "#f47a16",
          600: "#d95b0c",
          700: "#b4410d",
          800: "#8f3412",
          900: "#742c12",
        },
      },
    },
  },
  plugins: [],
};
export default config;
