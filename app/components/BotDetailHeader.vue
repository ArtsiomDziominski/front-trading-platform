<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import type { BotActions } from '~/composables/useBotActions'
import { BOT_TYPE_LABEL_KEYS, botDirection, botStatusView, supportedExchange } from '~/utils/botView'
import { formatDateTime } from '~/utils/formatNumber'

/** Bot page header: identity, status and every action as a labelled button. */
const props = defineProps<{
  bot: BotListItem
  actions: BotActions
}>()

const { t, locale } = useI18n()

const status = computed(() => botStatusView(props.bot))
const direction = computed(() => botDirection(props.bot))
const exchange = computed(() => supportedExchange(props.bot))
const typeLabel = computed(() => {
  const key = BOT_TYPE_LABEL_KEYS[props.bot.bot_type]
  return key ? t(key) : props.bot.bot_type
})
const createdLabel = computed(() => formatDateTime(props.bot.created_at, locale.value))
</script>

<template>
  <header class="bot-detail-header">
    <div class="bot-detail-header__identity">
      <div class="bot-detail-header__title-row">
        <button
          type="button"
          class="bot-detail-header__star"
          :class="{ 'bot-detail-header__star--on': bot.favorite, 'bot-detail-header__star--pop': actions.favoritePop }"
          :aria-label="bot.favorite ? $t('bots.favorite_remove') : $t('bots.favorite_add')"
          :aria-pressed="bot.favorite"
          @click="actions.toggleFavorite"
        >
          <svg viewBox="0 0 24 24" :fill="bot.favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
        </button>
        <h1 class="bot-detail-header__symbol">{{ bot.symbol }}</h1>
        <BotExchangeBadge v-if="exchange" :exchange="exchange" size="md" />
        <span class="bot-detail-header__direction" :class="`bot-detail-header__direction--${direction.toLowerCase()}`">
          {{ direction }}
        </span>
        <span class="bot-detail-header__status" :class="`bot-detail-header__status--${status.tone}`">
          <span v-if="status.live" class="bot-detail-header__dot" aria-hidden="true" />
          {{ $t(status.labelKey) }}
        </span>
      </div>
      <p class="bot-detail-header__meta">
        <span>{{ typeLabel }}</span>
        <span>#{{ bot.id }}</span>
        <span>{{ $t('bots.detail_created', { date: createdLabel }) }}</span>
      </p>
    </div>

    <div class="bot-detail-header__actions" role="group" :aria-label="$t('bots.help_actions_title')">
      <AppButton
        v-if="actions.canEditMixedGrid"
        variant="secondary"
        size="sm"
        icon="i-lucide-list-ordered"
        class="bot-detail-header__config"
        :disabled="actions.isBusy"
        :loading="actions.isLoading('update-config')"
        @click="actions.openMixedGrid"
      >
        {{ $t('bots.mixed_edit') }}
        <span v-if="actions.mixedOrdersCount != null" class="bot-detail-header__action-value">{{ actions.mixedOrdersCount }}</span>
      </AppButton>
      <AppButton
        v-if="actions.canEditGridConfig"
        variant="secondary"
        size="sm"
        icon="i-lucide-target"
        class="bot-detail-header__config"
        :disabled="actions.isBusy"
        @click="actions.openTakeProfit"
      >
        {{ $t('bots.take_profit_edit') }}
        <span class="bot-detail-header__action-value">{{ actions.takeProfitValue }}</span>
      </AppButton>
      <AppButton
        v-if="actions.canEditGridConfig"
        variant="secondary"
        size="sm"
        icon="i-lucide-shield"
        class="bot-detail-header__config"
        :disabled="actions.isBusy"
        @click="actions.openStopLoss"
      >
        {{ $t('bots.stop_loss_edit') }}
        <span class="bot-detail-header__action-value">{{ actions.stopLossValue }}</span>
      </AppButton>
      <UTooltip v-if="actions.canStop" :text="$t('bots.action_stop_hint')" :delay-duration="600">
        <AppButton
          variant="secondary"
          size="sm"
          icon="i-lucide-pause"
          :disabled="actions.isBusy"
          :loading="actions.isLoading('stop')"
          @click="actions.stop"
        >
          {{ $t('bots.action_stop') }}
        </AppButton>
      </UTooltip>
      <UTooltip v-if="actions.canRedeploy" :text="$t('bots.action_redeploy_hint')" :delay-duration="600">
        <AppButton
          variant="secondary"
          size="sm"
          icon="i-lucide-refresh-cw"
          class="bot-detail-header__wide"
          :disabled="actions.isBusy"
          :loading="actions.isLoading('redeploy')"
          @click="actions.openConfirm('redeploy')"
        >
          {{ $t('bots.action_redeploy') }}
        </AppButton>
      </UTooltip>
      <UTooltip v-if="actions.canClose" :text="$t('bots.action_close_hint')" :delay-duration="600">
        <AppButton
          variant="secondary"
          size="sm"
          icon="i-lucide-square"
          :disabled="actions.isBusy"
          :loading="actions.isLoading('close')"
          @click="actions.openConfirm('close')"
        >
          {{ $t('bots.action_close') }}
        </AppButton>
      </UTooltip>
      <AppButton
        variant="secondary"
        size="sm"
        icon="i-lucide-history"
        :to="`/history?bot_id=${bot.id}`"
      >
        {{ $t('bots.event_history_open') }}
      </AppButton>
      <UTooltip v-if="actions.canRemove" :text="$t('bots.action_remove_hint')" :delay-duration="600">
        <AppButton
          variant="secondary"
          size="sm"
          icon="i-lucide-trash-2"
          class="bot-detail-header__remove"
          :disabled="actions.isBusy"
          :loading="actions.isLoading('remove')"
          @click="actions.openConfirm('remove')"
        >
          {{ $t('bots.action_remove') }}
        </AppButton>
      </UTooltip>
    </div>
  </header>
</template>

<style scoped>
.bot-detail-header {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bot-detail-header__identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.bot-detail-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bot-detail-header__star {
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: rgb(255 255 255 / 35%);
  cursor: pointer;
}

.bot-detail-header__star:hover,
.bot-detail-header__star--on {
  color: var(--color-accent);
}

.bot-detail-header__star svg {
  width: 20px;
  height: 20px;
}

.bot-detail-header__star--pop svg {
  animation: bot-detail-star-pop 0.45s ease;
}

@keyframes bot-detail-star-pop {
  40% {
    transform: scale(1.5) rotate(-18deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

.bot-detail-header__symbol {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.bot-detail-header__direction {
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.bot-detail-header__direction--long {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.bot-detail-header__direction--short {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.bot-detail-header__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 11px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 12.5px;
  font-weight: 600;
}

.bot-detail-header__status--live {
  border-color: var(--color-up-dim);
  color: var(--color-text);
}

.bot-detail-header__status--warning {
  border-color: rgb(245 166 35 / 45%);
  color: var(--color-warning);
}

.bot-detail-header__status--error {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.bot-detail-header__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-up);
  animation: bot-detail-pulse 2.4s ease-in-out infinite;
}

@keyframes bot-detail-pulse {
  50% {
    opacity: 0.45;
  }
}

.bot-detail-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.bot-detail-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bot-detail-header__action-value {
  color: var(--color-text-muted);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* The global `button { font: inherit }` outranks UButton's size classes on <button> but not on <a>; pin one size for both */
.bot-detail-header__actions :deep(.app-button) {
  font-size: 0.85rem;
  font-weight: 600;
}

.bot-detail-header__actions :deep(.app-button--secondary) {
  color: #fff;
}

.bot-detail-header__remove:not(:disabled) {
  color: var(--color-danger) !important;
}

/* Phones: settings with their values as full-width rows, actions two per row */
@media (max-width: 640px) {
  .bot-detail-header__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-flow: row dense;
  }

  .bot-detail-header__actions :deep(.app-button) {
    min-width: 0;
    min-height: 40px;
    justify-content: center;
  }

  .bot-detail-header__actions :deep(.app-button.bot-detail-header__config) {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .bot-detail-header__config .bot-detail-header__action-value {
    margin-left: auto;
  }

  .bot-detail-header__actions :deep(.app-button.bot-detail-header__wide) {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bot-detail-header__dot,
  .bot-detail-header__star--pop svg {
    animation: none;
  }
}
</style>
