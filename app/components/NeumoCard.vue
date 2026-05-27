<template>
  <div class="neumo-card" :class="[`neumo-card--${variant}`, { 'neumo-card--clickable': !!to }]">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'raised' | 'inset'
  to?: string
}>()
</script>

<style scoped>
.neumo-card {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: 24px;
  transition: box-shadow 0.25s, transform 0.25s;
}

.neumo-card--raised {
  box-shadow: var(--shadow-md);
}

.neumo-card--inset {
  box-shadow: var(--shadow-inset-md);
}

.neumo-card--clickable {
  cursor: pointer;
}

.neumo-card--clickable:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.neumo-card--clickable:active {
  box-shadow: var(--shadow-inset-sm);
  transform: translateY(0);
}
</style>
