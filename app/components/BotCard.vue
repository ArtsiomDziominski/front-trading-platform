<template>
  <NeumoCard variant="raised" class="bot-card">
    <div class="bot-card__header">
      <span class="bot-card__symbol">{{ bot.symbol }}</span>
      <span
        class="bot-card__status"
        :class="`bot-card__status--${bot.lifecycle_status.toLowerCase()}`"
      >
        {{ statusLabel }}
      </span>
    </div>
    <div class="bot-card__body">
      <div class="bot-card__row">
        <span class="bot-card__label">{{ $t('bots.exchange') }}</span>
        <span class="bot-card__value">{{ bot.exchange || 'Binance' }}</span>
      </div>
      <div class="bot-card__row">
        <span class="bot-card__label">{{ $t('bots.type') }}</span>
        <span class="bot-card__value">{{ typeLabel }}</span>
      </div>
      <div class="bot-card__row bot-card__row--pnl">
        <span class="bot-card__label">{{ $t('bots.pnl') }}</span>
        <span :class="pnlClass">{{ bot.pnl ?? '—' }}</span>
      </div>
    </div>
  </NeumoCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  bot: {
    id: number
    symbol: string
    bot_type: string
    lifecycle_status: string
    engine_state: string
    exchange?: string
    pnl?: string
  }
}>()

const { locale } = useI18n()

const statusLabel = computed(() => {
  const key = props.bot.lifecycle_status
  if (key === 'ACTIVE') return 'Активен'
  if (key === 'STOPPED') return 'Остановлен'
  if (key === 'CLOSED') return 'Закрыт'
  if (key === 'ERROR') return 'Ошибка'
  return key
})

const typeLabel = computed(() => {
  const t = props.bot.bot_type
  if (t === 'GRID_FUTURES') return 'Grid Futures'
  if (t === 'GRID_SPOT') return 'Grid Spot'
  if (t === 'DCA_FUTURES') return 'DCA Futures'
  if (t === 'DCA_SPOT') return 'DCA Spot'
  return t
})

const pnlClass = computed(() => {
  const p = props.bot.pnl
  if (!p) return ''
  return p.startsWith('-') ? 'bot-card__pnl--down' : 'bot-card__pnl--up'
})
</script>

<style scoped>
.bot-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.bot-card__symbol {
  font-size: 1.1rem;
  font-weight: 700;
}

.bot-card__status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-inset-sm);
}

.bot-card__status--active {
  color: var(--color-accent);
}

.bot-card__status--stopped {
  color: var(--color-text-muted);
}

.bot-card__status--error {
  color: var(--color-danger);
}

.bot-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bot-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bot-card__row--pnl {
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.bot-card__label {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.bot-card__value {
  font-weight: 600;
  font-size: 0.9rem;
}

.bot-card__pnl--up {
  color: var(--color-accent);
  font-weight: 700;
}

.bot-card__pnl--down {
  color: var(--color-danger);
  font-weight: 700;
}
</style>
