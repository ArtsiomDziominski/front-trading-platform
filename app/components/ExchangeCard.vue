<template>
  <UCard class="exchange-card text-center" :variant="active ? 'outline' : 'subtle'">
    <div class="exchange-card__icon">{{ icon }}</div>
    <h3 class="exchange-card__name">{{ name }}</h3>
    <p class="exchange-card__desc">{{ description }}</p>
    <div class="exchange-card__footer">
      <UBadge
        v-if="active"
        color="primary"
        variant="subtle"
        :label="$t('exchanges.status_active')"
      />
      <UBadge
        v-else
        color="neutral"
        variant="subtle"
        :label="$t('exchanges.status_soon')"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  description: string
  icon: string
  active: boolean
}>()
</script>

<style scoped>
.exchange-card {
  padding: 32px 24px;
}

.exchange-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-alt);
  font-size: 2rem;
}

.exchange-card__name {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
}

.exchange-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.6;
}

.exchange-card__footer {
  display: flex;
  justify-content: center;
}
</style>
