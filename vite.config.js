import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        // La coquille de l'app est préchargée ; les données viennent d'IndexedDB
        // et jamais du réseau — le hors-ligne est acquis par construction.
        // Les deux casses de TTF sont nécessaires : les polices du projet sont
        // nommées en majuscules, et glob est sensible à la casse hors macOS —
        // un build Linux ne les préchargerait pas autrement.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,ttf,TTF,woff,woff2}'],
      },
      manifest: {
        name: 'Babines',
        short_name: 'Babines',
        description: 'Le bloc-note de toute ta musique',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffe13f',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android profite du partage direct depuis Spotify ou YouTube.
        // iOS ignore silencieusement cette clé : aucun code mort, le coller-coller
        // de QuickAdd reste le chemin commun aux deux systèmes.
        share_target: {
          action: '/partage',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
    }),
  ],
  define: {
    global: {},
  },
  optimizeDeps: {
    include: ['events'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      events: 'events/'
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.js'],
  },
})
