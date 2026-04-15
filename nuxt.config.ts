// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: nuxt.config.ts
// ============================================================

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },


  // --- MODULES ---
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxtjs/supabase",
  ],

  // --- SUPABASE CONFIG ---
  supabase: {
    redirect: false, // manual redirect via middleware
  },

  routeRules: {
    '/lottie-proxy/**': { proxy: 'https://plugins.lottiefiles.com/**' },
  },

  // --- RUNTIME CONFIG ---
  // Public: exposed to client
  // Private: server-only (never sent to browser)
  runtimeConfig: {
    // PRIVATE (server only)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // PUBLIC (client)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
  

  // --- SEO / HEAD ---
  app: {
    head: {
      titleTemplate: "%s | Tanya Ustadz V3",
      title: "Tanya Ustadz",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Platform tanya jawab anonim untuk kajian mingguan AhsanTV. Kirim pertanyaan, dapatkan jawaban langsung dari Ustadz.",
        },
        // OpenGraph
        { property: "og:type",        content: "website" },
        { property: "og:title",       content: "Tanya Ustadz | AhsanTV" },
        {
          property: "og:description",
          content: "Tanya pertanyaan Islammu secara anonim dan dapatkan jawaban langsung dari Ustadz.",
        },
        { property: "og:image",       content: "/og-image.png" },
        // WhatsApp preview
        { name: "twitter:card",       content: "summary_large_image" },
        { name: "twitter:title",      content: "Tanya Ustadz | AhsanTV" },
        { name: "twitter:description", content: "Platform Q&A kajian mingguan AhsanTV." },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
    },
  },

  // --- TYPESCRIPT ---
  typescript: {
    strict: true,
    typeCheck: false, // enable in CI if needed
  },

  // --- TAILWIND ---
  // tailwind.config.ts will handle the emerald theme
  // (generated in UI step)

  components: [
    { path: '~/components', pathPrefix: false },
  ],
});
