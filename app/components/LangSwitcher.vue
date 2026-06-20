<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
const { public: { locales: enabledLocales } } = useRuntimeConfig()

const localeItems = computed(() =>
  locales.value
    .filter((loc) => enabledLocales.includes(loc.code))
    .map((loc) => ({
      label: loc.name ?? loc.code,
      value: loc.code,
    })),
)

const localeModel = computed({
  get: () => locale.value,
  set: (code: string) => setLocale(code as typeof locale.value),
})
</script>

<template>
  <USelect
    v-model="localeModel"
    :items="localeItems"
    :aria-label="$t('common.language')"
    size="sm"
    class="min-w-[7rem]"
  />
</template>
