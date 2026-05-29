<template>
  <UCard class="bot-card">
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

    <div v-if="hasActions" class="bot-card__actions">
      <UButton
        v-if="canStop"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="isBusy"
        :loading="isBotActionLoading(bot.id, 'stop')"
        @click="handleStop"
      >
        {{ $t('bots.action_stop') }}
      </UButton>
      <UButton
        v-if="canRedeploy"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="isBusy"
        :loading="isBotActionLoading(bot.id, 'redeploy')"
        @click="openConfirm('redeploy')"
      >
        {{ $t('bots.action_redeploy') }}
      </UButton>
      <UButton
        v-if="canClose"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="isBusy"
        :loading="isBotActionLoading(bot.id, 'close')"
        @click="openConfirm('close')"
      >
        {{ $t('bots.action_close') }}
      </UButton>
      <UButton
        v-if="canRemove"
        color="error"
        size="sm"
        :disabled="isBusy"
        :loading="isBotActionLoading(bot.id, 'remove')"
        @click="openConfirm('remove')"
      >
        {{ $t('bots.action_remove') }}
      </UButton>
    </div>

    <p v-if="actionError" class="bot-card__action-error" role="alert">
      {{ actionError }}
    </p>

    <ConfirmModal
      v-model="confirmOpen"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.confirmLabel"
      :cancel-label="$t('common.cancel')"
      :loading-label="$t('common.loading')"
      :loading="confirmLoading"
      :confirm-variant="confirmCopy.variant"
      @confirm="confirmAction"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { formatSignedPercent } from '~/utils/formatPercent'

const props = defineProps<{
  bot: BotListItem
}>()

const { t } = useI18n()
const {
  stopBot,
  closeBot,
  redeployBotGrid,
  removeBot,
  isBotActionLoading,
  getBotActionError,
  clearBotActionError,
} = useBots()

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

const canStop = computed(() => props.bot.lifecycle_status === 'ACTIVE')
const canClose = computed(() => props.bot.lifecycle_status !== 'CLOSED')
const canRedeploy = computed(() =>
  props.bot.lifecycle_status === 'ACTIVE' && props.bot.bot_type === 'GRID_FUTURES',
)
const canRemove = computed(() => !props.bot.deleted_at)
const hasActions = computed(() => canStop.value || canClose.value || canRedeploy.value || canRemove.value)
const isBusy = computed(() => isBotActionLoading(props.bot.id))
const actionError = computed(() => getBotActionError(props.bot.id))

type CardAction = 'close' | 'redeploy' | 'remove'
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const pendingAction = ref<CardAction | null>(null)

const confirmCopy = computed(() => {
  const symbol = props.bot.symbol
  switch (pendingAction.value) {
    case 'close':
      return {
        title: t('bots.confirm_close_title', { symbol }),
        message: t('bots.confirm_close', { symbol }),
        confirmLabel: t('bots.action_close'),
        variant: 'primary' as const,
      }
    case 'redeploy':
      return {
        title: t('bots.confirm_redeploy_title', { symbol }),
        message: t('bots.confirm_redeploy', { symbol }),
        confirmLabel: t('bots.action_redeploy'),
        variant: 'primary' as const,
      }
    case 'remove':
      return {
        title: t('bots.confirm_remove_title', { symbol }),
        message: t('bots.confirm_remove', { symbol }),
        confirmLabel: t('bots.action_remove'),
        variant: 'danger' as const,
      }
    default:
      return {
        title: '',
        message: '',
        confirmLabel: t('common.confirm'),
        variant: 'primary' as const,
      }
  }
})

watch(() => props.bot.id, () => {
  clearBotActionError(props.bot.id)
})

function openConfirm(action: CardAction) {
  if (isBusy.value) return
  pendingAction.value = action
  confirmOpen.value = true
}

async function confirmAction() {
  if (!pendingAction.value) return

  confirmLoading.value = true
  clearBotActionError(props.bot.id)

  try {
    if (pendingAction.value === 'close') {
      await closeBot(props.bot.id)
    } else if (pendingAction.value === 'redeploy') {
      await redeployBotGrid(props.bot.id)
    } else if (pendingAction.value === 'remove') {
      await removeBot(props.bot.id)
    }
    confirmOpen.value = false
    pendingAction.value = null
  } catch {
    // error shown under card
  } finally {
    confirmLoading.value = false
  }
}

async function handleStop() {
  clearBotActionError(props.bot.id)
  await stopBot(props.bot.id)
}
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

.bot-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.bot-card__action-error {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--color-danger);
}
</style>
