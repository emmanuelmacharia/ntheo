/** @type {import('tailwindcss').Config} */
const tw = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: "hsl(var( --color-burgundy))",
        burntOrange: "hsl(var(--color-burnt-orange))",
        coral: "hsl(var(--color-coral))",
        gold: "hsl(var(--color-gold))",
        pink: "hsl(var(--color-pink))",
        primary: "hsl(var(--color-primary))",
      },
    },
  },
  plugins: [],
};

export default tw;
