import { ALL_I18N_LOCALES, parseLocaleCodesFromEnv, resolveDefaultLocale } from './shared/types/locale'

const enabledLocaleCodes = parseLocaleCodesFromEnv()
const defaultLocale = resolveDefaultLocale(enabledLocaleCodes)

export default defineNuxtConfig({
  compatibilityDate: '2026-05-12',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', '@nuxt/ui'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    storageKey: 'trading-platform-color-mode-v3',
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
      appName: 'Botinex',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://botinex.ru',
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
      yandexVerification: process.env.NUXT_PUBLIC_YANDEX_VERIFICATION ?? '',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
      telegramBotUsername: process.env.NUXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '',
      googleAnalyticsId: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? '',
      locales: enabledLocaleCodes,
      defaultLocale: defaultLocale ?? 'ru',
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: defaultLocale,
      },
      title: 'Botinex — торговые боты для криптовалюты',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,500&family=Dela+Gothic+One&family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'Botinex — платформа для автоматической торговли криптовалютой: grid и анти-мартингейл боты на фьючерсах Binance и OKX.',
        },
        { name: 'application-name', content: 'Botinex' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#000000' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Botinex' },
      ],
    },
  },
  routeRules: {
    '/auth/reset-password': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/auth/reset-password': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/auth/reset-password-confirm': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/auth/reset-password-confirm': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/auth/google/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/auth/google/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/settings': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/settings': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/history': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/history': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/bots': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/bots': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/bots/create/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/bots/create/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  i18n: {
    locales: ALL_I18N_LOCALES,
    defaultLocale,
    strategy: 'prefix_except_default',
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://botinex.ru',
    restructureDir: 'app',
    langDir: 'i18n/',
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
