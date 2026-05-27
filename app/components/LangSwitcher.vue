<template>
  <div class="lang-switcher" role="group" :aria-label="$t('common.language')">
    <button
      v-for="loc in locales"
      :key="loc.code"
      class="lang-btn"
      :class="{ 'lang-btn--active': locale === loc.code }"
      @click="switchLocale(loc.code)"
    >
      {{ loc.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const switchLocale = (code: 'ru' | 'en') => {
  setLocale(code)
}
</script>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  box-shadow: var(--shadow-inset-sm);
}

.lang-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s;
}

.lang-btn--active {
  background: var(--color-surface-alt);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
</style>
