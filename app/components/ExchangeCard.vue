<template>
  <UCard class="exchange-card text-center" :variant="active ? 'outline' : 'subtle'">
    <div class="exchange-card__icon">
      <ExchangeIcon :exchange="exchange" />
    </div>
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
      <UButton
        v-if="active && to"
        size="sm"
        color="primary"
        variant="soft"
        class="exchange-card__cta"
        :to="to"
      >
        {{ $t('exchanges.connect') }}
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import ExchangeIcon from '~/components/ExchangeIcon.vue'
import type { ExchangeType } from '#shared/types/api-key'

defineProps<{
  name: string
  description: string
  exchange: Exclude<ExchangeType, 'OTHER'>
  active: boolean
  to?: string
}>()
</script>

<style scoped>
.exchange-card {
  padding: 36px 28px;
  height: 100%;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease;
}

.exchange-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}

.exchange-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
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
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.exchange-card__cta {
  width: 100%;
  justify-content: center;
}
</style>
