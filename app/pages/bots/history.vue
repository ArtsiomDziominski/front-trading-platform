<script setup lang="ts">
import type { BotEventOut, BotListItem } from '#shared/types/bot'
import { botEventTypeTone, formatBotEventPayload, translateBotEventType } from '~/utils/botEventType'

definePageMeta({
  middleware: 'auth',
})

const { t, te, locale } = useI18n()
const { fetchBots, fetchBotHistory } = useBots()

useSeoMeta({
  title: () => t('bots.event_history_title'),
  description: () => t('bots.event_history_subtitle'),
})

const bots = ref<BotListItem[]>([])
const events = ref<BotEventOut[]>([])
const botsLoading = ref(true)
const eventsLoading = ref(false)
const eventsError = ref<string | null>(null)
const selectedBotId = ref<number | 'all'>('all')

const botFilterModel = computed({
  get: (): number | 'all' | undefined => selectedBotId.value,
  set: (value: number | 'all' | undefined) => {
    selectedBotId.value = value ?? 'all'
  },
})

const botById = computed(() => new Map(bots.value.map((bot) => [bot.id, bot])))

const botFilterItems = computed(() => [
  { label: t('bots.event_history_filter_all'), value: 'all' as const },
  ...bots.value.map((bot) => ({
    label: `#${bot.id} · ${bot.symbol}`,
    value: bot.id,
  })),
])

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function eventTypeLabel(eventType: string): string {
  return translateBotEventType(t, te, eventType)
}

function eventTypeClass(eventType: string): string {
  return `event-item__type--${botEventTypeTone(eventType)}`
}

function formatPayload(payload: BotEventOut['payload']): string {
  return formatBotEventPayload(t, te, payload)
}

function botLabel(botId: number): string {
  const bot = botById.value.get(botId)
  return bot ? `#${bot.id} · ${bot.symbol}` : `#${botId}`
}

async function loadEvents() {
  eventsLoading.value = true
  eventsError.value = null

  try {
    const botId = selectedBotId.value === 'all' ? undefined : selectedBotId.value
    events.value = await fetchBotHistory(botId)
  } catch {
    eventsError.value = t('bots.event_history_load_error')
    events.value = []
  } finally {
    eventsLoading.value = false
  }
}

async function loadPageData() {
  botsLoading.value = true

  try {
    bots.value = await fetchBots()
    await loadEvents()
  } catch {
    eventsError.value = t('bots.event_history_load_error')
  } finally {
    botsLoading.value = false
  }
}

watch(selectedBotId, () => {
  if (!botsLoading.value) {
    loadEvents()
  }
})

onMounted(() => {
  loadPageData()
})
</script>

<template>
  <main class="page-section">
    <div class="container history-container">
      <div class="page-header">
        <div>
          <span class="section-label">{{ $t('bots.event_history_title') }}</span>
          <h1 class="section-title">{{ $t('bots.event_history_subtitle') }}</h1>
        </div>
        <UButton color="neutral" variant="outline" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </UButton>
      </div>

      <div class="history-toolbar">
        <UFormField :label="$t('bots.event_history_filter_bot')" class="history-filter">
          <USelect
            id="bot-history-filter"
            v-model="botFilterModel"
            :items="botFilterItems"
            :disabled="botsLoading || eventsLoading"
            class="w-full"
          />
        </UFormField>
      </div>

      <p v-if="botsLoading || eventsLoading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="eventsError" class="state-message state-message--error" role="alert">
        <p>{{ eventsError }}</p>
        <UButton color="neutral" variant="outline" size="sm" @click="loadEvents">
          {{ $t('common.retry') }}
        </UButton>
      </div>

      <ul v-else-if="events.length" class="event-list">
        <li v-for="event in events" :key="event.id" class="event-item">
          <div class="event-item__head">
            <span class="event-item__type" :class="eventTypeClass(event.event_type)">
              {{ eventTypeLabel(event.event_type) }}
            </span>
            <time class="event-item__time">{{ formatDate(event.created_at) }}</time>
          </div>
          <p class="event-item__bot">{{ botLabel(event.bot_id) }}</p>
          <pre v-if="formatPayload(event.payload)" class="event-item__payload">{{ formatPayload(event.payload) }}</pre>
        </li>
      </ul>

      <UCard v-else class="empty-state text-center">
        <p class="text-muted">{{ $t('bots.event_history_empty') }}</p>
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.history-toolbar {
  margin-bottom: 24px;
}

.history-filter {
  max-width: 360px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.event-item {
  padding: 18px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-bento);
  background:
    linear-gradient(155deg, rgb(255 255 255 / 3%) 0%, transparent 40%),
    var(--color-surface-alt);
}

.event-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.event-item__type {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.event-item__type--created {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.event-item__type--updated {
  color: #2563eb;
  background: color-mix(in srgb, #2563eb 12%, transparent);
}

.event-item__type--stopped {
  color: #d97706;
  background: color-mix(in srgb, #d97706 12%, transparent);
}

.event-item__type--closed {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}

.event-item__type--removed {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.event-item__type--redeployed {
  color: #7c3aed;
  background: color-mix(in srgb, #7c3aed 12%, transparent);
}

.event-item__type--config {
  color: #0891b2;
  background: color-mix(in srgb, #0891b2 12%, transparent);
}

.event-item__type--error {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 16%, transparent);
}

.event-item__type--default {
  color: var(--color-text);
  background: var(--color-surface);
}

.event-item__time {
  color: var(--color-text-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.event-item__bot {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.event-item__payload {
  margin: 12px 0 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 0.78rem;
  line-height: 1.45;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.state-message--error {
  color: var(--color-danger);
}

.empty-state {
  padding: 48px 24px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .history-filter {
    max-width: none;
  }

  .event-item__head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
