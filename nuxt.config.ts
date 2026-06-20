import { buildI18nLocales, parseLocaleCodesFromEnv, resolveDefaultLocale } from './shared/i18n/locales'

const localeCodes = parseLocaleCodesFromEnv()
const defaultLocale = resolveDefaultLocale(localeCodes)
const i18nLocales = buildI18nLocales(localeCodes)

export default defineNuxtConfig({
  compatibilityDate: '2026-05-12',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', '@nuxt/ui'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    storageKey: 'trading-platform-color-mode',
  },
  css: ['~/assets/css/main.css'],
  future: {
    compatibilityVersion: 4,
  },
  experimental: {
    typedPages: true,
  },
  runtimeConfig: {
    public: {
      appName: 'Trading Bot Platform',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
      telegramBotUsername: process.env.NUXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '',
      locales: localeCodes,
      defaultLocale,
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: defaultLocale,
      },
      title: 'Trading Bot Platform',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'Платформа для создания торговых ботов. Binance, Bybit, OKX.',
        },
      ],
    },
  },
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  i18n: {
    locales: i18nLocales,
    defaultLocale,
    strategy: 'prefix_except_default',
    restructureDir: 'app',
    langDir: 'i18n/',
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
})
