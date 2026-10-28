<script setup lang="ts">
import type { BotEventOut, BotListItem, CandleOut } from '#shared/types/bot'

/** Everything known about one bot, laid out for `/bots/:id`. */
const props = defineProps<{
  bot: BotListItem
  candles: CandleOut[]
  events: BotEventOut[]
  eventsLoading: boolean
  eventsLoaded: boolean
  eventsError: string | null
}>()

const emit = defineEmits<{
  retryEvents: []
  /** True while this page removes the bot, so the page keeps it on screen until the redirect. */
  removing: [value: boolean]
}>()

const router = useRouter()

const actions = useBotActions(() => props.bot, {
  onRemoving: (value) => emit('removing', value),
  onRemoved: async () => {
    await router.replace('/bots')
  },
})

const isAntiMartingale = computed(() => props.bot.bot_type === 'ANTI_MARTINGALE_FUTURES')
const isTrend = computed(() => props.bot.bot_type === 'TREND_FUTURES')
const isDcaSpot = computed(() => props.bot.bot_type === 'DCA_SPOT')
const hasGridCycles = computed(() => props.bot.bot_type === 'GRID_FUTURES' && props.bot.cycle_state != null)
</script>

<template>
  <div class="bot-detail-view">
    <BotDetailHeader :bot="bot" :actions="actions" />

    <UAlert
      v-if="actions.engineError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('bots.detail_engine_error')"
      :description="actions.engineError"
      class="bot-detail-view__alert"
    />
    <UAlert
      v-if="actions.actionError"
      color="error"
      variant="subtle"
      :title="actions.actionError"
      class="bot-detail-view__alert"
      role="alert"
    />

    <BotDetailPosition :bot="bot" />

    <BotDetailAntiMartingale
      v-if="isAntiMartingale"
      :bot="bot"
      :candles="candles"
      :events="events"
      :events-loaded="eventsLoaded"
      :events-error="eventsError"
    />

    <BotDetailTrend v-if="isTrend" :bot="bot" />

    <BotDetailDcaSpot v-if="isDcaSpot" :bot="bot" />

    <div class="bot-detail-view__columns">
      <div class="bot-detail-view__main">
        <BotDetailGrid v-if="hasGridCycles" :bot="bot" :events="events" />
        <BotDetailEvents
          :bot-id="bot.id"
          :events="events"
          :loading="eventsLoading"
          :loaded="eventsLoaded"
          :error="eventsError"
          @retry="emit('retryEvents')"
        />
      </div>
      <aside class="bot-detail-view__side">
        <BotDetailSettings
          :bot="bot"
          :take-profit-value="actions.takeProfitValue"
          :stop-loss-value="actions.stopLossValue"
        />
        <BotDetailInfo :bot="bot" />
      </aside>
    </div>

    <BotActionModals
      v-model:confirm-open="actions.confirmOpen"
      v-model:take-profit-open="actions.takeProfitOpen"
      v-model:stop-loss-open="actions.stopLossOpen"
      v-model:mixed-grid-open="actions.mixedGridOpen"
      :bot="bot"
      :confirm-copy="actions.confirmCopy"
      :confirm-loading="actions.confirmLoading"
      :confirm-error="actions.confirmError"
      :can-edit-grid-config="actions.canEditGridConfig"
      :can-edit-mixed-grid="actions.canEditMixedGrid"
      @confirm="actions.confirmAction"
      @cancel="actions.cancelConfirm"
    />
  </div>
</template>

<style scoped>
.bot-detail-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bot-detail-view__alert :deep([data-slot="description"]) {
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.bot-detail-view__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 16px;
  align-items: start;
}

.bot-detail-view__main,
.bot-detail-view__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (max-width: 1023px) {
  .bot-detail-view__columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
