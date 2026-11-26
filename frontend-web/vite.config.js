import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // TAL-196: Service Worker propio (src/sw.js) para manejar el evento `sync` de Background Sync
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifestFilename: 'manifest.json',
      manifest: {
        id: '/',
        name: 'InfraManager - Gestión de Infraestructura TI',
        short_name: 'InfraManager',
        description: 'Plataforma integral de gestión de infraestructura TI, control de incidencias y mantenimiento preventivo.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#003366',
        lang: 'es',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Reportar Incidencia',
            short_name: 'Nueva Falla',
            description: 'Registrar una nueva incidencia en el sistema',
            url: '/incidencias/nueva',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Panel Principal',
            short_name: 'Dashboard',
            description: 'Ver resumen y métricas de infraestructura',
            url: '/dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      injectManifest: {
        // TAL-203: Precaché enfocado en App Shell e íconos PWA; los chunks lazy se cachean bajo demanda en sw.js
        globPatterns: [
          'index.html',
          'manifest.json',
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-*.png',
          'assets/index-*.{js,css}',
          'assets/vendor-*.js',
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    // TAL-203: Source maps para auditoría valid-source-maps y división modular de vendors
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-socket',
              test: /[\\/]node_modules[\\/](socket\.io-client|engine\.io-client|@socket\.io)[\\/]/,
              priority: 15,
            },
            {
              name: 'vendor-http',
              test: /[\\/]node_modules[\\/](axios|workbox-window)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
