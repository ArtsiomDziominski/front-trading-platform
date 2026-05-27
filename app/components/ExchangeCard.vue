<template>
  <NeumoCard :variant="active ? 'raised' : 'inset'" class="exchange-card">
    <div class="exchange-card__icon">{{ icon }}</div>
    <h3 class="exchange-card__name">{{ name }}</h3>
    <p class="exchange-card__desc">{{ description }}</p>
    <div class="exchange-card__footer">
      <span v-if="active" class="exchange-card__badge exchange-card__badge--active">
        {{ $t('exchanges.status_active') }}
      </span>
      <span v-else class="exchange-card__badge exchange-card__badge--soon">
        {{ $t('exchanges.status_soon') }}
      </span>
    </div>
  </NeumoCard>
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
  text-align: center;
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
  box-shadow: var(--shadow-inset-sm);
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

.exchange-card__badge {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-inset-sm);
}

.exchange-card__badge--active {
  color: var(--color-accent);
}

.exchange-card__badge--soon {
  color: var(--color-text-muted);
}
</style>
