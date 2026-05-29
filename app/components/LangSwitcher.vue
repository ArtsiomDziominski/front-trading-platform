<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

function switchLocale(code: string) {
  setLocale(code as 'ru' | 'en')
}
</script>

<template>
  <UFieldGroup size="sm" :aria-label="$t('common.language')">
    <UButton
      v-for="loc in locales"
      :key="loc.code"
      :label="loc.name ?? loc.code"
      :color="locale === loc.code ? 'primary' : 'neutral'"
      :variant="locale === loc.code ? 'solid' : 'ghost'"
      @click="switchLocale(loc.code)"
    />
  </UFieldGroup>
</template>
