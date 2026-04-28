import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icons/*.png', 'offline.html'],
      manifest: {
        name: 'iConnect — Medical Education Platform',
        short_name: 'iConnect',
        description: 'PG Medical Aspirant Learning Platform by Icon Lifesciences — E-Books, Quizzes, Live Arena, AI Doubt Buster.',
        theme_color: '#1E1B4B',
        background_color: '#F8FAFC',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        scope: '/',
        start_url: '/?source=pwa',
        id: '/',
        orientation: 'portrait-primary',
        lang: 'en-IN',
        dir: 'ltr',
        categories: ['education', 'medical', 'productivity'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Home',
            description: 'Go to your dashboard',
            url: '/dashboard?source=shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'E-Books Library',
            short_name: 'Library',
            description: 'Browse your e-books',
            url: '/ebooks?source=shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Exams',
            short_name: 'Exams',
            description: 'Take an exam',
            url: '/exam?source=shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'AI Doubt Buster',
            short_name: 'Ask AI',
            description: 'Ask a medical question',
            url: '/dashboard?source=shortcut&open=ai',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        share_target: {
          action: '/?share=1',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
        screenshots: [
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'iConnect Dashboard',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Force new SW to activate immediately on deploy — no stale cache
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // SPA fallback for navigation — served from precache instantly (App Shell Model)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /^\/offline\.html$/],
        // Increase max file size so the main bundle doesn't silently skip precache
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          // ── Google Fonts stylesheets (StaleWhileRevalidate for fast load + refresh) ──
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // ── Google Fonts webfont files (CacheFirst — immutable, 1 year) ──
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Supabase storage signed URLs (images, thumbnails, PDFs) ──
          // CacheFirst because signed URLs are short-lived but the content is immutable for the URL's lifetime
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Activity logs — BackgroundSync so offline events are retried ──
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/activity_logs.*/i,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'activity-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          // ── Supabase auth endpoints — ALWAYS network, NEVER cache (security) ──
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          // ── Supabase edge functions (AI, notifications) — NetworkOnly ──
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkOnly',
          },
          // ── All other Supabase REST reads (public content catalog) ──
          // StaleWhileRevalidate: instant cached response, then background refresh.
          // This is the heart of the "instant load" feel — content catalog shows
          // immediately on re-visit while fresh data arrives in the background.
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-rest-v1',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── App images (icons, logos, user-uploaded) ──
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|avif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
