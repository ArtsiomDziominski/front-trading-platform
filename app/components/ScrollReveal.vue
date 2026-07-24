<script setup lang="ts">
import { motion } from 'motion-v'

const props = withDefaults(defineProps<{
  /** Extra delay after entering viewport (seconds). */
  delay?: number
  /** Vertical travel in px before reveal. */
  distance?: number
}>(), {
  delay: 0,
  distance: 48,
})

const ease = [0.22, 1, 0.36, 1] as const

const prefersReducedMotion = import.meta.client
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const initial = prefersReducedMotion
  ? { opacity: 1, y: 0, filter: 'blur(0px)' }
  : { opacity: 0, y: props.distance, filter: 'blur(6px)' }

const visible = { opacity: 1, y: 0, filter: 'blur(0px)' }
</script>

<template>
  <motion.div
    class="scroll-reveal"
    :initial="initial"
    :while-in-view="visible"
    :in-view-options="{ once: true, amount: 0.22, margin: '0px 0px -8% 0px' }"
    :transition="{
      duration: prefersReducedMotion ? 0 : 0.9,
      delay: prefersReducedMotion ? 0 : delay,
      ease,
    }"
  >
    <slot />
  </motion.div>
</template>

<style scoped>
.scroll-reveal {
  will-change: transform, opacity, filter;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    will-change: auto;
  }
}
</style>
