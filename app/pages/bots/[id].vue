<script setup lang="ts">
import type { BotListItem, CandleOut } from '#shared/types/bot'
import { isFiniteCandle } from '~/utils/candleChart'

definePageMeta({
  middleware: 'bots-auth',
  validate: (route) => {
    const id = (route.params as { id?: string | string[] }).id
    return /^\d+$/.test(String(Array.isArray(id) ? id[0] : id))
  },
})

const route = useRoute()
const { t } = useI18n()
const {
  bots,
  loading,
  error,
  fetchBots,
  subscribeBotsUpdates,
} = useBots()

const botId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  return Number(value)
})

const bot = computed(() => {
  if (!Number.isFinite(botId.value)) return null
  return bots.value.find((item) => item.id === botId.value) ?? null
})

// Removing the bot from this page drops it from the list before the redirect: keep showing it meanwhile
const leaving = ref(false)
const lastBot = shallowRef<BotListItem | null>(null)
watch(bot, (value) => {
  if (value) lastBot.value = value
}, { immediate: true })
const shownBot = computed(() => bot.value ?? (leaving.value ? lastBot.value : null))

// There is no single-bot endpoint: the page waits for the list before it can say the bot is gone
const listLoaded = ref(false)
const missing = computed(() => listLoaded.value && !loading.value && !error.value && !shownBot.value)

const {
  events,
  loading: eventsLoading,
  loaded: eventsLoaded,
  error: eventsError,
  load: loadEvents,
  refresh: refreshEvents,
} = useBotEvents(botId)

// A tick whose candle request failed carries `recent_candles: null`; keep the last chart instead of blanking it
const candles = ref<CandleOut[]>([])
watch(() => bot.value?.recent_candles, (value) => {
  const valid = value?.filter(isFiniteCandle)
  if (valid?.length) candles.value = valid
}, { immediate: true })
watch(botId, () => {
  candles.value = bot.value?.recent_candles?.filter(isFiniteCandle) ?? []
})

// Events are not pushed: reload them when the bot's own state moves. A fill changes only the
// position (size, average entry), not the bot row, so those are part of the trigger too.
const eventTrigger = computed(() => {
  const current = bot.value
  if (!current) return null
  return [
    current.lifecycle_status,
    current.engine_state,
    current.config_version,
    current.position_size,
    current.entry_price,
    current.updated_at,
  ].join('|')
})
watch(eventTrigger, (next, previous) => {
  if (next && previous && next !== previous) refreshEvents()
})

usePageSeo({
  title: () => (bot.value
    ? `${bot.value.symbol} #${bot.value.id}`
    : t('bots.title')),
  description: () => t('bots.subtitle'),
  noindex: true,
})

async function loadBots() {
  await fetchBots()
  listLoaded.value = true
}

let unsubscribeWs: (() => void) | undefined
let disposed = false

onMounted(async () => {
  void loadEvents()
  await loadBots()
  // Left before the list arrived: subscribing now would leave the socket open with no one to close it
  if (disposed) return
  unsubscribeWs = subscribeBotsUpdates()
})

onUnmounted(() => {
  disposed = true
  unsubscribeWs?.()
})
</script>

<template>
  <main class="page-section">
    <div class="container bot-detail">
      <div class="page-header">
        <AppButton variant="secondary" size="sm" icon="i-lucide-arrow-left" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </AppButton>
      </div>

      <BotDetailView
        v-if="shownBot"
        :bot="shownBot"
        :candles="candles"
        :events="events"
        :events-loading="eventsLoading"
        :events-loaded="eventsLoaded"
        :events-error="eventsError"
        @retry-events="loadEvents"
        @removing="leaving = $event"
      />

      <div v-else-if="error" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <AppButton variant="secondary" size="sm" @click="() => void loadBots()">
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <UCard v-else-if="missing" class="empty-state text-center">
        <p class="empty-state__text">{{ $t('bots.stop_loss_not_found') }}</p>
        <div class="empty-state__actions">
          <AppButton to="/bots">
            {{ $t('bots.back_to_bots') }}
          </AppButton>
          <AppButton variant="secondary" :to="`/history?bot_id=${botId}`">
            {{ $t('bots.event_history_open') }}
          </AppButton>
        </div>
      </UCard>

      <p v-else class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>
    </div>
  </main>
</template>

<style scoped>
.page-header {
  display: flex;
  margin-bottom: 20px;
}

.state-message {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.state-message--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-danger);
}

.empty-state {
  max-width: 720px;
  padding: 32px;
}

.empty-state__text {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
</style>
