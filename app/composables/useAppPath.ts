import { parseLocaleCodesFromEnv } from '#shared/types/locale'

type LocalePath = ReturnType<typeof useLocalePath>
type LocalePathTarget = Parameters<LocalePath>[0]
type LocalePathLocale = Parameters<LocalePath>[1]

/**
 * Internal links in the site's current language: `/en/bots` on the English site, `/bots` in the default language.
 * The prefix is added only for a language enabled in NUXT_PUBLIC_LOCALES (`runtimeConfig.public.locales`):
 * a page opened under a language the env leaves out links to the default-language pages.
 *
 * Works in components, composables and route middleware (the locale comes from the Nuxt app, not from a
 * component's `useI18n`); during a navigation it is already the target page's language.
 */
export function useAppPath() {
  const nuxtApp = useNuxtApp()
  const localePath = useLocalePath()
  const { locales, defaultLocale } = useRuntimeConfig().public
  // An env override at runtime (NUXT_PUBLIC_LOCALES=ru,en) arrives as a string, not as the build-time array
  const enabled: string[] = Array.isArray(locales) ? locales.map(String) : parseLocaleCodesFromEnv(String(locales ?? ''))

  return (to: string | LocalePathTarget): string => {
    const current = String(nuxtApp.$i18n.locale.value)
    const lang = current !== defaultLocale && enabled.includes(current) ? current : defaultLocale
    const path = localePath(to as LocalePathTarget, lang as LocalePathLocale)
    return path || (typeof to === 'string' ? to : '/')
  }
}
