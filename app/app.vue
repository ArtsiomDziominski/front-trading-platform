<script setup lang="ts">
const config = useRuntimeConfig()

const googleAnalyticsId = config.public.googleAnalyticsId?.trim() || ''

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
