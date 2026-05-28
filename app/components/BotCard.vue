<template>
  <NeumoCard variant="raised" class="bot-card">
    <div class="bot-card__header">
      <span class="bot-card__symbol">{{ bot.symbol }}</span>
      <span
        class="bot-card__status"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>
    <div class="bot-card__body">
      <div class="bot-card__row">
        <span class="bot-card__label">{{ $t('bots.exchange') }}</span>
        <span class="bot-card__value">{{ bot.exchange || '—' }}</span>
      </div>
      <div class="bot-card__row">
        <span class="bot-card__label">{{ $t('bots.type') }}</span>
        <span class="bot-card__value">{{ typeLabel }}</span>
      </div>
      <div class="bot-card__row bot-card__row--pnl">
        <span class="bot-card__label">{{ $t('bots.pnl') }}</span>
        <span :class="pnlClass">{{ pnlLabel }}</span>
      </div>
    </div>
  </NeumoCard>
</template>

<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { formatSignedPercent } from '~/utils/formatPercent'

const props = defineProps<{
  bot: BotListItem
}>()

const { t } = useI18n()

function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} USDT`
}

const pnlLabel = computed(() => {
  const { unrealized_pnl, pnl_percent } = props.bot

  if (unrealized_pnl == null && pnl_percent == null) {
    return '—'
  }

  const parts: string[] = []
  if (unrealized_pnl != null) {
    parts.push(formatPnl(unrealized_pnl))
  }
  if (pnl_percent != null) {
    parts.push(`(${formatSignedPercent(pnl_percent)})`)
  }
  return parts.join(' ')
})

const statusClass = computed(() => {
  if (props.bot.engine_state === 'ERROR') {
    return 'bot-card__status--error'
  }
  return `bot-card__status--${props.bot.lifecycle_status.toLowerCase()}`
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    ACTIVE: t('bots.status_active'),
    STOPPED: t('bots.status_stopped'),
    CLOSED: t('bots.status_closed'),
  }
  if (props.bot.engine_state === 'ERROR') {
    return t('bots.status_error')
  }
  return labels[props.bot.lifecycle_status] ?? props.bot.lifecycle_status
})

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    GRID_FUTURES: t('bots.type_grid_futures'),
    GRID_SPOT: t('bots.type_grid_spot'),
    DCA_FUTURES: t('bots.type_dca_futures'),
    DCA_SPOT: t('bots.type_dca_spot'),
    CUSTOM: t('bots.type_custom'),
  }
  return labels[props.bot.bot_type] ?? props.bot.bot_type
})

const pnlClass = computed(() => {
  const value = props.bot.unrealized_pnl ?? props.bot.pnl_percent
  if (value == null || value === 0) return ''
  return value < 0 ? 'bot-card__pnl--down' : 'bot-card__pnl--up'
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

.bot-card__status--stopped,
.bot-card__status--closed {
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
