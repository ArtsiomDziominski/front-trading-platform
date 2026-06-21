<script setup lang="ts">
import type { SupportedExchange } from '#shared/utils/exchange-images'
import { EXCHANGE_IMAGES, exchangeDisplayName } from '#shared/utils/exchange-images'

const props = withDefaults(defineProps<{
  exchange: SupportedExchange
  size?: 'md' | 'compact'
}>(), {
  size: 'md',
})

const src = computed(() => EXCHANGE_IMAGES[props.exchange])
const alt = computed(() => exchangeDisplayName(props.exchange))
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    class="exchange-icon"
    :class="`exchange-icon--${size}`"
    loading="lazy"
    decoding="async"
  >
</template>
