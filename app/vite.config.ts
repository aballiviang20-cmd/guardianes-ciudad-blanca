import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "HistoryBol · Patrimonio de Sucre",
        short_name: "HistoryBol",
        description: "Conoce, colecciona y protege el patrimonio de Sucre.",
        theme_color: "#C0532D",
        background_color: "#FBF8F3",
        display: "standalone",
        start_url: "/",
        lang: "es",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff,woff2}", "personajes/ojos.json"],
        // TensorFlow.js pesa más de 2 MB: se precachea igual para que el escaneo funcione offline.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Contenido aprobado: red primero, y si no hay conexión, la última copia guardada.
            urlPattern: ({ url }) => url.pathname === "/api/lessons" || url.pathname === "/api/monuments",
            handler: "NetworkFirst",
            options: { cacheName: "api-contenido", networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) => url.pathname === "/api/classifier",
            handler: "NetworkFirst",
            options: { cacheName: "api-reconocimiento", networkTimeoutSeconds: 4 },
          },
          {
            // Pesos de MobileNet (TF Hub / Kaggle / Google Storage): se guardan la primera vez para usarlos sin red.
            urlPattern: ({ url }) => /(^|\.)(tfhub\.dev|kaggle\.com|kaggleusercontent\.com|storage\.googleapis\.com)$/.test(url.hostname),
            handler: "CacheFirst",
            options: { cacheName: "modelos", cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 40 } },
          },
          {
            // Fondos ilustrados (data/fondos) y lista de fondos: se guardan para verse sin conexión.
            urlPattern: ({ url }) => url.pathname.startsWith("/fondos/") || url.pathname === "/api/fondos" || url.pathname === "/api/cuentos",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "arte-y-cuentos", cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname === "/api/league",
            handler: "NetworkFirst",
            options: { cacheName: "api-liga", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8787" } },
  preview: { proxy: { "/api": "http://localhost:8787" } },
});
