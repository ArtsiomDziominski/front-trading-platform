<script setup lang="ts">
const config = useRuntimeConfig()

const googleAnalyticsId = config.public.googleAnalyticsId?.trim() || ''
const googleSiteVerification = config.public.googleSiteVerification?.trim() || ''
const yandexVerification = config.public.yandexVerification?.trim() || ''

const { t } = useI18n()
const i18nHead = useLocaleHead({ dir: true, lang: true, seo: true })

useHead(() => ({
  titleTemplate: (chunk?: string) => (chunk ? `${chunk} — ${t('seo.site_name')}` : t('seo.default_title')),
  htmlAttrs: {
    lang: i18nHead.value.htmlAttrs?.lang,
    dir: i18nHead.value.htmlAttrs?.dir,
  },
  link: [...(i18nHead.value.link || [])],
  meta: [
    ...(i18nHead.value.meta || []),
    ...(googleSiteVerification ? [{ name: 'google-site-verification', content: googleSiteVerification }] : []),
    ...(yandexVerification ? [{ name: 'yandex-verification', content: yandexVerification }] : []),
  ],
}))

useHead({
  script: googleAnalyticsId
    ? [
        {
          src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`,
          async: true,
        },
        {
          innerHTML: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(googleAnalyticsId)});`,
        },
      ]
    : [],
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
