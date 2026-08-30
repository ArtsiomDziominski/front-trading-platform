<script setup lang="ts">
const { t } = useI18n()

useHomeSmoothScroll()

useSeoMeta({
  title: () => t('nav.home'),
  description: () => t('home.hero_subtitle'),
})
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
