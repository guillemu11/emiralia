/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./desarrolladores.html",
    "./desarrollador.html",
    "./propiedades.html",
    "./propiedades-v2.html",
    "./propiedad.html",
    "./blog.html",
    "./articulo.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#3B82F6",       // blue-500 — analytics, stable growth
        success: "#16A34A",         // green-600 — positive signals, ROI
        "success-bg": "#DCFCE7",    // green-100 — success badges
        warning: "#FB923C",         // orange-400 — medium indicators
        danger: "#EF4444",          // red-500 — alerts, negative
        "primary-text": "#0F172A",  // slate-900
        "secondary-text": "#475569",// slate-600 ✅ WCAG FIX: contrast 7.5:1 (was #64748B)
        "muted-text": "#94A3B8",    // slate-400
        "background-light": "#FFFFFF",
        "background-dark": "#0F172A",
        "section-bg": "#F7F7F7",
        "light-fill": "#F1F5F9",    // slate-100
        "border-color": "#F3F4F6",  // gray-100 (default)
        "border-emphasis": "#E5E7EB", // gray-200 (nav, containers)
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        "xl": "12px",
        "2xl": "24px",
        "3xl": "32px",
        "full": "9999px",
      },
    },
  },
  plugins: [],
}
