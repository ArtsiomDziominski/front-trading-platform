<script setup lang="ts">
import type { BotEventOut, BotListItem } from '#shared/types/bot'
import {
  botEventTypeTone,
  extractBotEventMessage,
  formatBotEventPayloadWithoutMessage,
  translateBotEventType,
} from '~/utils/botEventType'
import { parseBotEventMessage } from '~/utils/parseBotEventMessage'

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

function botLabel(botId: number): string {
  const bot = botById.value.get(botId)
  return bot ? `#${bot.id} · ${bot.symbol}` : `#${botId}`
}

function resolveEventMessage(payload: BotEventOut['payload']) {
  const raw = extractBotEventMessage(payload)
  if (!raw) return null

  const parsed = parseBotEventMessage(raw)

  if (!parsed.parsed) {
    return {
      text: parsed.fallback || raw,
      meta: [] as Array<{ title: string; description: string }>,
    }
  }

  const meta = [
    ...(parsed.exchange
      ? [{ title: t('bots.event_history_exchange'), description: parsed.exchange }]
      : []),
    ...parsed.fields,
  ]

  if (parsed.primary) {
    return {
      text: parsed.primary,
      meta,
    }
  }

  return {
    text: parsed.exchange || t('bots.event_history_message_title'),
    meta: parsed.fields,
  }
}

const eventRows = computed(() =>
  events.value.map((event) => ({
    event,
    message: resolveEventMessage(event.payload),
    payloadText: formatBotEventPayloadWithoutMessage(t, te, event.payload),
  })),
)

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
          <h1 class="section-title">{{ $t('bots.event_history_title') }}</h1>
          <p class="page-header__message">{{ $t('bots.event_history_subtitle') }}</p>
        </div>
        <AppButton variant="secondary" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </AppButton>
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
        <AppButton variant="secondary" size="sm" @click="loadEvents">
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <ul v-else-if="eventRows.length" class="event-list">
        <li v-for="{ event, message, payloadText } in eventRows" :key="event.id" class="event-item">
          <div class="event-item__head">
            <span class="event-item__type" :class="eventTypeClass(event.event_type)">
              {{ eventTypeLabel(event.event_type) }}
            </span>
            <time class="event-item__time">{{ formatDate(event.created_at) }}</time>
          </div>
          <p class="event-item__bot">{{ botLabel(event.bot_id) }}</p>
          <div v-if="message" class="event-item__error" role="alert">
            <p class="event-item__error-text">{{ message.text }}</p>
            <dl v-if="message.meta.length" class="event-item__error-meta">
              <div
                v-for="field in message.meta"
                :key="`${event.id}-${field.title}`"
                class="event-item__error-meta-item"
              >
                <dt class="event-item__error-meta-key">{{ field.title }}</dt>
                <dd class="event-item__error-meta-value">{{ field.description }}</dd>
              </div>
            </dl>
          </div>
          <pre v-if="payloadText" class="event-item__payload">{{ payloadText }}</pre>
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

.page-header__message {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
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
  border: 1px solid var(--bento-border);
  border-radius: var(--radius-bento);
  color: var(--color-on-surface);
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
  color: var(--color-on-surface-muted);
  background: var(--bento-surface);
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
  color: var(--color-on-surface);
  background: var(--bento-surface);
}

.event-item__time {
  color: var(--color-on-surface-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.event-item__bot {
  margin: 0;
  color: var(--color-on-surface-muted);
  font-size: 0.85rem;
}

.event-item__error {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgb(251 113 133 / 22%);
  background: linear-gradient(135deg, rgb(251 113 133 / 14%) 0%, rgb(251 113 133 / 6%) 100%);
}

.event-item__error-text {
  margin: 0;
  color: var(--bento-danger);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.event-item__error-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 8px 0 0;
}

.event-item__error-meta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.event-item__error-meta-key {
  margin: 0;
  color: var(--color-on-surface-muted);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.event-item__error-meta-value {
  margin: 0;
  color: var(--color-on-surface);
  font-size: 0.8rem;
  font-weight: 500;
  word-break: break-word;
}

.event-item__payload {
  margin: 12px 0 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--bento-border);
  background: var(--bento-surface);
  color: var(--color-on-surface);
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
    align-items: stretch;
    gap: 18px;
  }

  .page-header > :last-child {
    width: 100%;
  }

  .history-filter {
    max-width: none;
  }

  .event-item {
    padding: 16px;
  }

  .event-item__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
