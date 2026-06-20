<script setup lang="ts">
import type { LocaleCode } from '#shared/i18n/locales'

const { locale, locales, setLocale } = useI18n()

const localeItems = computed(() =>
  locales.value.map((loc) => ({
    label: loc.name ?? loc.code,
    value: loc.code,
  })),
)

const localeModel = computed({
  get: () => locale.value,
  set: (code: string) => setLocale(code as LocaleCode),
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
