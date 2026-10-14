import type { MaybeRefOrGetter } from 'vue'

export interface PageSeoOptions {
  /** Page title; the site name is appended by the title template unless `fullTitle` is set. */
  title: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string>
  /** Use `title` as is, without the " — Botinex" suffix (home page). */
  fullTitle?: boolean
  /** Private or service pages: keep them out of search results. */
  noindex?: boolean
}

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export function usePageSeo(options: PageSeoOptions) {
  const { t, locale } = useI18n()
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/+$/, '')
  const siteName = t('seo.site_name')

  const title = () => toValue(options.title)
  const description = () => toValue(options.description) || t('seo.default_description')
  const socialTitle = () => (options.fullTitle ? title() : `${title()} — ${siteName}`)
  const ogImage = () => `${siteUrl}/og/botinex-${locale.value === 'en' ? 'en' : 'ru'}.jpg`

  useHead({
    ...(options.fullTitle ? { titleTemplate: null } : {}),
    meta: [{ key: 'keywords', name: 'keywords', content: () => t('seo.keywords') }],
  })

  useSeoMeta({
    title,
    description,
    robots: options.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
    ogSiteName: siteName,
    ogTitle: socialTitle,
    ogDescription: description,
    ogImage,
    ogImageWidth: OG_IMAGE_WIDTH,
    ogImageHeight: OG_IMAGE_HEIGHT,
    ogImageType: 'image/jpeg',
    ogImageAlt: () => t('seo.og_image_alt'),
    twitterCard: 'summary_large_image',
    twitterTitle: socialTitle,
    twitterDescription: description,
    twitterImage: ogImage,
    twitterImageAlt: () => t('seo.og_image_alt'),
  })
}
