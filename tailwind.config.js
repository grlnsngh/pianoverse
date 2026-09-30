/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#161622",
          100: "#161622",
          200: "#1E1E2D",
          300: "#232533",
          400: "#2C2C3E",
          500: "#3B3B4D",
          600: "#4A4A5C",
          700: "#5A5A6C",
          800: "#6A6A7C",
          900: "#7B7B8D",
        },
        secondary: {
          DEFAULT: "#FF9C01",
          100: "#FF9001",
          200: "#FF8E01",
        },
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#CDCDE0",
        },
        // The redesign (SPEC section 3). Keep in step with constants/theme.ts.
        // The navy scheme above stays until the last screen has moved.
        page: "#FFFFFF",
        grouped: "#F6F5F2",
        fill: "#EFEDE8",
        hairline: "#E7E4DD",
        ink: "#1A1814",
        ink2: "#6B665D",
        ink3: "#6F6A62",
        brand: "#FF9C01",
        "brand-text": "#A85D00",
        late: "#C4321C",
        "late-tint": "#FCEDEA",
        "late-tint-text": "#7A1F10",
      },
      borderRadius: {
        input: "12px",
        control: "14px",
        card: "16px",
        panel: "20px",
        sheet: "24px",
      },
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
        // The redesign's font. One family per weight, as React Native needs
        figtree: ["Figtree_400Regular", "sans-serif"],
        "figtree-medium": ["Figtree_500Medium", "sans-serif"],
        "figtree-semibold": ["Figtree_600SemiBold", "sans-serif"],
        "figtree-bold": ["Figtree_700Bold", "sans-serif"],
      },
      height: {
        16: "4rem",
        32: "8rem",
      },
    },
  },
  plugins: [],
};
