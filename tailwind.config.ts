import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 12px 30px rgba(31, 41, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
