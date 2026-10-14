import { DEFAULT_LOCALE_CODES } from '#shared/types/locale'

/** Public pages that belong in search results and in the sitemap. */
export const INDEXABLE_PATHS = ['/', '/bots/overview', '/exchanges', '/auth/register', '/auth/login'] as const

export function getSiteUrl(): string {
  const config = useRuntimeConfig()
  return String(config.public.siteUrl).replace(/\/+$/, '')
}

export function getSiteLocales(): { locales: string[], defaultLocale: string } {
  const config = useRuntimeConfig()
  const locales = Array.isArray(config.public.locales) && config.public.locales.length > 0
    ? config.public.locales.map(String)
    : [...DEFAULT_LOCALE_CODES]
  return { locales, defaultLocale: String(config.public.defaultLocale || locales[0]) }
}

export function localizedUrl(path: string, locale: string, defaultLocale: string): string {
  const siteUrl = getSiteUrl()
  if (locale === defaultLocale) {
    return `${siteUrl}${path}`
  }
  return `${siteUrl}/${locale}${path === '/' ? '' : path}`
}

/**
 * Preview deployments (Vercel non-production) must stay out of search engines.
 * `NUXT_SITE_INDEXABLE=false|true` overrides the automatic detection.
 */
export function isSiteIndexable(): boolean {
  const override = process.env.NUXT_SITE_INDEXABLE?.trim().toLowerCase()
  if (override === 'true' || override === '1') {
    return true
  }
  if (override === 'false' || override === '0') {
    return false
  }
  const vercelEnv = process.env.VERCEL_ENV
  return !vercelEnv || vercelEnv === 'production'
}
