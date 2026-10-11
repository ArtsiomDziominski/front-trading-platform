<script setup lang="ts">
import type { BotEventOut } from '#shared/types/bot'
import { EXCHANGE_IMAGES, exchangeDisplayName, type SupportedExchange } from '#shared/utils/exchange-images'
import { botEventDetails, type BotEventDetail } from '~/utils/botEventDetails'
import {
  botEventTypeTone,
  extractBotEventMessage,
  normalizeBotEventType,
  translateBotEventTitle,
} from '~/utils/botEventType'
import { parseBotEventMessage } from '~/utils/parseBotEventMessage'

const props = withDefaults(defineProps<{
  events: BotEventOut[]
  compact?: boolean
}>(), {
  compact: false,
})

const { t, te, locale } = useI18n()

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function eventTypeLabel(event: BotEventOut): string {
  return translateBotEventTitle(t, te, event.event_type, event.payload)
}

function eventTypeClass(eventType: string): string {
  return `event-item__type--${botEventTypeTone(eventType)}`
}

function isSupportedExchange(value: string): value is SupportedExchange {
  return value in EXCHANGE_IMAGES
}

function detailClass(detail: BotEventDetail): string | undefined {
  return detail.tone ? `event-item__detail--${detail.tone}` : undefined
}

function errorMessage(payload: BotEventOut['payload']) {
  const raw = extractBotEventMessage(payload)
  if (!raw) return null

  const parsed = parseBotEventMessage(raw)
  if (!parsed.parsed) {
    return {
      text: parsed.fallback || raw,
      meta: [] as Array<{ title: string, description: string }>,
    }
  }

  const meta = [
    ...(parsed.exchange
      ? [{ title: t('bots.event_history_exchange'), description: parsed.exchange }]
      : []),
    ...parsed.fields,
  ]

  if (parsed.primary) {
    return { text: parsed.primary, meta }
  }

  return {
    text: parsed.exchange || t('bots.event_history_message_title'),
    meta: parsed.fields,
  }
}

const rows = computed(() =>
  props.events.map((event) => {
    const isError = normalizeBotEventType(event.event_type) === 'error'
    const details = isError ? [] : botEventDetails(event, t, locale.value)
    return {
      event,
      chips: details.filter((detail) => !detail.note),
      notes: details.filter((detail) => detail.note),
      message: isError ? errorMessage(event.payload) : null,
    }
  }),
)
</script>

<template>
  <ul class="event-list">
    <li
      v-for="{ event, chips, notes, message } in rows"
      :key="event.id"
      class="event-item"
    >
      <div class="event-item__head">
        <span
          class="event-item__type"
          :class="eventTypeClass(event.event_type)"
        >
          {{ eventTypeLabel(event) }}
        </span>
        <time class="event-item__time">{{ formatDate(event.created_at) }}</time>
      </div>

      <p
        v-if="!compact"
        class="event-item__meta"
      >
        <span>#{{ event.bot_id }}</span>
        <span>{{ event.symbol }}</span>
        <span class="event-item__exchange">
          <img
            v-if="isSupportedExchange(event.exchange)"
            :src="EXCHANGE_IMAGES[event.exchange]"
            :alt="exchangeDisplayName(event.exchange)"
            class="event-item__exchange-icon"
            loading="lazy"
            decoding="async"
          >
          <span>{{ isSupportedExchange(event.exchange) ? exchangeDisplayName(event.exchange) : event.exchange }}</span>
        </span>
      </p>

      <ul
        v-if="chips.length"
        class="event-item__details"
      >
        <li
          v-for="(detail, index) in chips"
          :key="index"
          class="event-item__detail"
          :class="detailClass(detail)"
        >
          <span
            v-if="detail.label"
            class="event-item__detail-label"
          >{{ detail.label }}</span>
          <span class="event-item__detail-value">{{ detail.value }}</span>
        </li>
      </ul>

      <p
        v-for="(note, index) in notes"
        :key="`note-${index}`"
        class="event-item__note"
      >
        {{ note.value }}
      </p>

      <div
        v-if="message"
        class="event-item__error"
        role="alert"
      >
        <p class="event-item__error-text">{{ message.text }}</p>
        <dl
          v-if="message.meta.length"
          class="event-item__error-meta"
        >
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
    </li>
  </ul>
</template>

<style scoped>
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

.event-item__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 0;
  color: var(--color-on-surface-muted);
  font-size: 0.85rem;
}

.event-item__exchange {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.event-item__exchange-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.event-item__details {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.event-item__detail {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.event-item__detail-label {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.event-item__detail-value {
  color: var(--color-text);
  font-weight: 500;
  word-break: break-word;
}

.event-item__detail--up .event-item__detail-value {
  color: var(--color-up);
}

.event-item__detail--down .event-item__detail-value {
  color: var(--color-down);
}

.event-item__detail--muted .event-item__detail-value {
  color: var(--color-text-muted);
  font-weight: 400;
}

.event-item__note {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
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

@media (max-width: 640px) {
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
