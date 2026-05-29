<template>
  <UCard class="feature-card text-center">
    <div class="feature-icon" v-html="icon" />
    <h3 class="feature-title">{{ title }}</h3>
    <p class="feature-desc">{{ description }}</p>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<style scoped>
.feature-card {
  padding: 32px 24px;
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-size: 1.6rem;
}

.feature-title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 700;
}

.feature-desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.92rem;
  line-height: 1.6;
}
</style>
