/** @type {import('tailwindcss').Config} */
export default {
  // ── Dark Mode ────────────────────────────────────────────────
  // 'class' strategy: Tailwind dark: variants activate when <html> has
  // the .dark class. This is toggled by the useTheme composable.
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // ── Primary ─────────────────────────────────────────────
        "primary":                  "#006948",
        "primary-container":        "#00855d",
        "primary-fixed":            "#85f8c4",
        "on-primary":               "#ffffff",
        "on-primary-container":     "#f5fff7",  // card selected background

        // ── Secondary ────────────────────────────────────────────
        "secondary-container":      "#adedd3",
        "secondary-fixed":          "#b0f0d6",  // background decoration blur

        // ── Tertiary ─────────────────────────────────────────────
        "tertiary":                 "#8d4b00",
        "tertiary-fixed":           "#ffdcc3",
        "on-tertiary-fixed":        "#2f1500",

        // ── Surface ──────────────────────────────────────────────
        "surface":                  "#f9f9ff",
        "background":               "#f9f9ff",  // alias surface, dipakai sebagai page bg
        "another-surface":          "#d3d3db",
        "on-surface":               "#141c2b",
        "on-surface-variant":       "#3d4a42",
        "on-background":            "#141c2b",  // alias on-surface
        "surface-container-low":    "#f1f3ff",
        "surface-container-high":   "#e0e8fd",
        "surface-container-lowest": "#ffffff",

        // ── Outline ──────────────────────────────────────────────
        "outline":                  "#6d7a72",
        "outline-variant":          "#bccac0",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        // Dipakai oleh tombol Konfirmasi Peran (primary shadow)
        "primary-md": "0px 12px 32px rgba(0,105,72,0.2)",
        "primary-lg": "0px 16px 40px rgba(0,105,72,0.3)",
      },
    },
  },
}