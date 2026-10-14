<script setup lang="ts">
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/+$/, '')

useHomeSmoothScroll()

usePageSeo({
  title: () => t('seo.home_title'),
  description: () => t('seo.home_description'),
  fullTitle: true,
})

const structuredData = computed(() => {
  const homeUrl = locale.value === config.public.defaultLocale ? `${siteUrl}/` : `${siteUrl}/${locale.value}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Botinex',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/favicon-512x512.png`,
        description: t('seo.org_description'),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Botinex',
        url: homeUrl,
        inLanguage: locale.value,
        description: t('seo.home_description'),
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#app`,
        name: 'Botinex',
        url: homeUrl,
        applicationCategory: 'FinanceApplication',
        applicationSubCategory: t('seo.app_category'),
        operatingSystem: 'Web',
        inLanguage: locale.value,
        description: t('seo.home_description'),
        image: `${siteUrl}/og/botinex-${locale.value === 'en' ? 'en' : 'ru'}.jpg`,
        featureList: [
          t('seo.feature_grid'),
          t('seo.feature_anti_martingale'),
          t('seo.feature_risk'),
          t('seo.feature_telegram'),
          t('seo.feature_keys'),
        ],
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  }
})

useHead(() => ({
  script: [
    {
      key: 'ld-json-home',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredData.value),
    },
  ],
}))
</script>

<template>
  <main class="scale-home">
    <HomeScaleHero />

    <ScrollReveal>
      <HomeScaleLifecycle />
    </ScrollReveal>

    <HomeScaleFeatureShowcase />

    <ScrollReveal>
      <HomeScaleQuote />
    </ScrollReveal>

    <ScrollReveal>
      <HomeScaleCta />
    </ScrollReveal>
  </main>
</template>

<style scoped>
.scale-home {
  overflow: clip;
  background: #000;
  color: #fff;
  font-family: Inter, "DM Sans", ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.011em;
}
</style>
