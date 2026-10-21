/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FBF7F4',
        card: '#FFFFFF',
        line: '#EFE6E0',
        ink: {
          DEFAULT: '#2E2A33',
          soft: '#6E6673',
          faint: '#7D7581',
        },
        peach: {
          50: '#FFF6F1',
          100: '#FFE9DD',
          200: '#FFD6C2',
          300: '#FFC4A8',
          700: '#9A4B26',
        },
        sky: {
          100: '#E8F2FB',
          200: '#CDE4F7',
          700: '#275F8C',
        },
        sage: {
          100: '#EAF6EE',
          200: '#D4EEDB',
          500: '#82C49A',
          700: '#2D6A43',
        },
        butter: {
          100: '#FDF6DE',
          200: '#FBEBC2',
          500: '#E9C55F',
          700: '#7D5E0E',
        },
        blush: {
          100: '#FCEBEE',
          200: '#F6CFD4',
          500: '#E592A0',
          700: '#962D43',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
