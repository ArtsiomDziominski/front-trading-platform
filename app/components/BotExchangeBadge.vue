<script setup lang="ts">
import type { SupportedExchange } from '#shared/utils/exchange-images'
import { EXCHANGE_IMAGES, exchangeDisplayName } from '#shared/utils/exchange-images'

/** Exchange logo on a light chip, so dark wordmarks (Bybit, OKX) stay readable on dark cards. */
const props = withDefaults(defineProps<{
  exchange: SupportedExchange
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

// okx.svg is a white square with the wordmark in the middle; the badge needs just the wordmark
const BADGE_IMAGES: Record<SupportedExchange, string> = {
  ...EXCHANGE_IMAGES,
  OKX: '/img/exchanges/okx-wordmark.svg',
}

const name = computed(() => exchangeDisplayName(props.exchange))
</script>

<template>
  <span
    class="exchange-badge"
    :class="[`exchange-badge--${size}`, { 'exchange-badge--mark': exchange === 'BINANCE' }]"
    :title="$t('bots.exchange_badge_title', { exchange: name })"
  >
    <img
      :src="BADGE_IMAGES[exchange]"
      :alt="name"
      class="exchange-badge__logo"
      loading="lazy"
      decoding="async"
    >
  </span>
</template>

<style scoped>
.exchange-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: #fff;
}

.exchange-badge__logo {
  display: block;
  width: auto;
  height: 11px;
}

/* Binance is a square mark, the others are wordmarks */
.exchange-badge--mark .exchange-badge__logo {
  height: 15px;
}

.exchange-badge--md {
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
}

.exchange-badge--md .exchange-badge__logo {
  height: 14px;
}

.exchange-badge--md.exchange-badge--mark .exchange-badge__logo {
  height: 19px;
}
</style>
