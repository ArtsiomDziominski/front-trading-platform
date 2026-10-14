<script setup lang="ts">
const { t } = useI18n()

usePageSeo({
  title: () => t('seo.overview_title'),
  description: () => t('seo.overview_description'),
})
</script>

<template>
  <BotsPublicOverview />
</template>
