<template>
  <motion.article
    class="bot-card"
    :initial="{ opacity: 0, y: 28 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{
      duration: 0.55,
      delay: staggerDelay,
      ease: [0.22, 1, 0.36, 1],
    }"
    :while-hover="{
      y: -6,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }"
  >
    <div class="bot-card__glow" aria-hidden="true" />

    <header class="bot-card__header">
      <div class="bot-card__identity">
        <span class="bot-card__symbol">{{ bot.symbol }}</span>
        <span class="bot-card__id">#{{ bot.id }}</span>
      </div>

      <motion.span
        class="bot-card__status"
        :class="statusClass"
        :initial="{ opacity: 0, scale: 0.92 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.4, delay: staggerDelay + 0.1 }"
      >
        <motion.span
          v-if="isActive"
          class="bot-card__status-dot"
          :animate="{ opacity: [0.45, 1, 0.45], scale: [0.92, 1.08, 0.92] }"
          :transition="{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }"
          aria-hidden="true"
        />
        {{ statusLabel }}
      </motion.span>
    </header>

    <div class="bot-card__bento">
      <motion.div
        class="bot-card__cell"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: staggerDelay + 0.15 }"
      >
        <span class="bot-card__label">{{ $t('bots.exchange') }}</span>
        <img
          v-if="bot.exchange && bot.exchange !== 'OTHER'"
          :src="EXCHANGE_IMAGES[bot.exchange]"
          :alt="exchangeDisplayName(bot.exchange)"
          class="exchange-icon exchange-icon--compact"
          loading="lazy"
          decoding="async"
        >
        <span v-else class="bot-card__value">—</span>
      </motion.div>

      <motion.div
        class="bot-card__cell"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: staggerDelay + 0.2 }"
      >
        <span class="bot-card__label">{{ $t('bots.type') }}</span>
        <span class="bot-card__value">{{ typeLabel }}</span>
      </motion.div>

      <motion.div
        class="bot-card__cell bot-card__cell--pnl"
        :class="pnlCellClass"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: staggerDelay + 0.25 }"
      >
        <span class="bot-card__label">{{ $t('bots.pnl') }}</span>
        <span class="bot-card__pnl" :class="pnlClass">{{ pnlLabel }}</span>
      </motion.div>
    </div>

    <motion.div
      v-if="hasActions"
      class="bot-card__actions"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :transition="{ duration: 0.4, delay: staggerDelay + 0.3 }"
    >
      <motion.button
        v-if="canStop"
        type="button"
        class="bot-card__action"
        :disabled="isBusy"
        :while-tap="{ scale: 0.96 }"
        @click="handleStop"
      >
        <span v-if="isBotActionLoading(bot.id, 'stop')" class="bot-card__action-spinner" aria-hidden="true" />
        {{ $t('bots.action_stop') }}
      </motion.button>

      <motion.button
        v-if="canRedeploy"
        type="button"
        class="bot-card__action"
        :disabled="isBusy"
        :while-tap="{ scale: 0.96 }"
        @click="openConfirm('redeploy')"
      >
        <span v-if="isBotActionLoading(bot.id, 'redeploy')" class="bot-card__action-spinner" aria-hidden="true" />
        {{ $t('bots.action_redeploy') }}
      </motion.button>

      <motion.button
        v-if="canClose"
        type="button"
        class="bot-card__action"
        :disabled="isBusy"
        :while-tap="{ scale: 0.96 }"
        @click="openConfirm('close')"
      >
        <span v-if="isBotActionLoading(bot.id, 'close')" class="bot-card__action-spinner" aria-hidden="true" />
        {{ $t('bots.action_close') }}
      </motion.button>

      <motion.button
        v-if="canRemove"
        type="button"
        class="bot-card__action bot-card__action--danger"
        :disabled="isBusy"
        :while-tap="{ scale: 0.96 }"
        @click="openConfirm('remove')"
      >
        <span v-if="isBotActionLoading(bot.id, 'remove')" class="bot-card__action-spinner" aria-hidden="true" />
        {{ $t('bots.action_remove') }}
      </motion.button>
    </motion.div>

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
  </motion.article>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { EXCHANGE_IMAGES, exchangeDisplayName } from '#shared/utils/exchange-images'
import type { BotListItem } from '#shared/types/bot'
import { formatSignedPercent } from '~/utils/formatPercent'

const props = withDefaults(defineProps<{
  bot: BotListItem
  index?: number
}>(), {
  index: 0,
})

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

const staggerDelay = computed(() => Math.min(props.index * 0.07, 0.42))

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

const isActive = computed(() =>
  props.bot.lifecycle_status === 'ACTIVE' && props.bot.engine_state !== 'ERROR',
)

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

const pnlCellClass = computed(() => {
  const value = props.bot.unrealized_pnl ?? props.bot.pnl_percent
  if (value == null || value === 0) return ''
  return value < 0 ? 'bot-card__cell--pnl-down' : 'bot-card__cell--pnl-up'
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
.bot-card {
  position: relative;
  overflow: hidden;
  padding: 26px;
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius);
  background:
    linear-gradient(155deg, rgb(255 255 255 / 4%) 0%, transparent 42%),
    linear-gradient(180deg, var(--color-surface-alt) 0%, var(--bento-bg) 100%);
  box-shadow: var(--shadow-elevated);
  color: var(--bento-text);
  cursor: default;
  will-change: transform;
}

.bot-card__glow {
  position: absolute;
  inset: -40% auto auto 50%;
  width: 70%;
  height: 55%;
  transform: translateX(-50%);
  border-radius: 999px;
  background: radial-gradient(circle, rgb(52 211 153 / 10%) 0%, transparent 70%);
  pointer-events: none;
}

.bot-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.bot-card__identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bot-card__symbol {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.bot-card__id {
  color: var(--bento-muted);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.bot-card__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--bento-border);
  border-radius: 999px;
  background: var(--bento-surface);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.bot-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.bot-card__status--active {
  color: var(--bento-accent);
  border-color: rgb(52 211 153 / 22%);
  background: linear-gradient(135deg, rgb(52 211 153 / 14%) 0%, rgb(52 211 153 / 6%) 100%);
}

.bot-card__status--stopped,
.bot-card__status--closed {
  color: var(--bento-muted);
}

.bot-card__status--error {
  color: var(--bento-danger);
  border-color: rgb(251 113 133 / 22%);
  background: linear-gradient(135deg, rgb(251 113 133 / 12%) 0%, rgb(251 113 133 / 5%) 100%);
}

.bot-card__bento {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bot-card__cell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-cell-radius);
  background: var(--bento-surface);
}

.bot-card__cell--pnl {
  grid-column: 1 / -1;
  gap: 12px;
  padding: 20px 22px;
}

.bot-card__cell--pnl-up {
  border-color: rgb(52 211 153 / 18%);
  background:
    linear-gradient(135deg, rgb(52 211 153 / 10%) 0%, rgb(52 211 153 / 3%) 100%),
    var(--bento-surface);
}

.bot-card__cell--pnl-down {
  border-color: rgb(251 113 133 / 18%);
  background:
    linear-gradient(135deg, rgb(251 113 133 / 10%) 0%, rgb(251 113 133 / 3%) 100%),
    var(--bento-surface);
}

.bot-card__label {
  color: var(--bento-muted);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bot-card__value {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.bot-card__pnl {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.bot-card__pnl--up {
  color: var(--bento-accent);
}

.bot-card__pnl--down {
  color: var(--bento-danger);
}

.bot-card__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--bento-border);
}

.bot-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--bento-border);
  border-radius: 12px;
  background: rgb(255 255 255 / 3%);
  color: var(--bento-text);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.bot-card__action:hover:not(:disabled) {
  background: rgb(255 255 255 / 7%);
  border-color: rgb(255 255 255 / 12%);
}

.bot-card__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bot-card__action--danger {
  color: var(--bento-danger);
  border-color: rgb(251 113 133 / 22%);
  background: linear-gradient(135deg, rgb(251 113 133 / 10%) 0%, rgb(251 113 133 / 4%) 100%);
}

.bot-card__action--danger:hover:not(:disabled) {
  background: linear-gradient(135deg, rgb(251 113 133 / 16%) 0%, rgb(251 113 133 / 8%) 100%);
  border-color: rgb(251 113 133 / 32%);
}

.bot-card__action-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgb(255 255 255 / 18%);
  border-top-color: currentColor;
  border-radius: 999px;
  animation: bot-card-spin 0.7s linear infinite;
}

.bot-card__action-error {
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  font-size: 0.78rem;
  color: var(--bento-danger);
}

@keyframes bot-card-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .bot-card {
    padding: 20px;
  }

  .bot-card__header {
    margin-bottom: 20px;
  }

  .bot-card__symbol {
    font-size: 1.15rem;
  }

  .bot-card__bento {
    gap: 10px;
  }

  .bot-card__cell {
    padding: 14px;
    gap: 8px;
  }

  .bot-card__cell--pnl {
    padding: 16px 16px;
  }

  .bot-card__pnl {
    font-size: 1.05rem;
  }

  .bot-card__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 18px;
    padding-top: 18px;
  }

  .bot-card__action {
    width: 100%;
    min-height: 44px;
    font-size: 0.82rem;
  }
}

@media (hover: none) {
  /* Disable lift animation residue on touch devices to avoid sticky hover state */
  .bot-card__action:hover:not(:disabled) {
    background: rgb(255 255 255 / 3%);
    border-color: var(--bento-border);
  }
}
</style>
