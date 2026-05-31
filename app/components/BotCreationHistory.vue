<template>
  <UCard class="creation-history">
    <h2 class="creation-history__title">
      {{ $t('bots.creation_history_title') }}
    </h2>
    <p class="creation-history__hint">
      {{ $t('bots.creation_history_hint') }}
    </p>

    <p v-if="loading" class="creation-history__state" role="status">
      {{ $t('common.loading') }}
    </p>

    <div v-else-if="error" class="creation-history__state creation-history__state--error" role="alert">
      <p>{{ error }}</p>
      <UButton color="neutral" variant="outline" size="sm" @click="$emit('retry')">
        {{ $t('common.retry') }}
      </UButton>
    </div>

    <ul v-else-if="items.length" class="creation-history__list">
      <li
        v-for="item in items"
        :key="item.id"
        class="creation-history__item"
        :class="{ 'creation-history__item--selected': selectedId === item.id }"
      >
        <div class="creation-history__item-body">
          <div class="creation-history__item-head">
            <span class="creation-history__symbol">{{ item.symbol || '—' }}</span>
            <span class="creation-history__outcome" :class="`creation-history__outcome--${item.outcome.toLowerCase()}`">
              {{ outcomeLabel(item.outcome) }}
            </span>
          </div>
          <p class="creation-history__meta">
            {{ formatDate(item.created_at) }}
            <span v-if="item.bot_id"> · #{{ item.bot_id }}</span>
          </p>

          <dl v-if="settingsFor(item).length" class="creation-history__settings">
            <div
              v-for="setting in settingsFor(item)"
              :key="`${item.id}-${setting.key}`"
              class="creation-history__setting"
            >
              <dt class="creation-history__setting-label">{{ settingLabel(setting.key) }}</dt>
              <dd class="creation-history__setting-value">{{ settingValue(setting) }}</dd>
            </div>
          </dl>

          <p v-if="item.error_message" class="creation-history__error">
            {{ item.error_message }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          class="creation-history__copy-btn"
          @click="$emit('select', item)"
        >
          {{ $t('bots.copy_settings') }}
        </UButton>
      </li>
    </ul>

    <p v-else class="creation-history__state">
      {{ $t('bots.creation_history_empty') }}
    </p>
  </UCard>
</template>

<script setup lang="ts">
import type { BotCreationLogOut, BotCreationOutcome, BotType } from '#shared/types/bot'
import type { CreationHistorySetting, CreationSettingKey } from '~/utils/formatBotCreationSettings'
import { extractCreationHistorySettings } from '~/utils/formatBotCreationSettings'

defineProps<{
  items: BotCreationLogOut[]
  loading: boolean
  error: string | null
  selectedId: number | null
}>()

defineEmits<{
  select: [item: BotCreationLogOut]
  retry: []
}>()

const { t, locale } = useI18n()

const SETTING_LABEL_KEYS: Record<CreationSettingKey, string> = {
  bot_type: 'bots.field_bot_type',
  api_key_id: 'bots.field_api_key',
  symbol: 'bots.field_symbol',
  direction: 'bots.field_direction',
  initial_amount: 'bots.field_initial_amount',
  grid_orders_count: 'bots.field_grid_orders',
  grid_step_percent: 'bots.field_grid_step',
  volume_mode: 'bots.field_volume_mode',
  start_price: 'bots.field_start_price',
  auto_restart: 'bots.field_auto_restart',
}

const BOT_TYPE_LABEL_KEYS: Record<BotType, string> = {
  GRID_FUTURES: 'bots.type_grid_futures',
  GRID_SPOT: 'bots.type_grid_spot',
  DCA_FUTURES: 'bots.type_dca_futures',
  DCA_SPOT: 'bots.type_dca_spot',
  CUSTOM: 'bots.type_custom',
}

function outcomeLabel(outcome: BotCreationOutcome): string {
  const keys: Record<BotCreationOutcome, string> = {
    CREATED_OK: 'bots.creation_outcome_ok',
    EXCHANGE_ERROR: 'bots.creation_outcome_exchange_error',
    VALIDATION_FAILED: 'bots.creation_outcome_validation_failed',
  }
  return t(keys[outcome])
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function settingsFor(item: BotCreationLogOut): CreationHistorySetting[] {
  return extractCreationHistorySettings(item.request_payload, item.symbol)
}

function settingLabel(key: CreationSettingKey): string {
  return t(SETTING_LABEL_KEYS[key])
}

function settingValue(setting: CreationHistorySetting): string {
  switch (setting.key) {
    case 'bot_type': {
      const key = BOT_TYPE_LABEL_KEYS[setting.value as BotType]
      return key ? t(key) : String(setting.value)
    }
    case 'api_key_id':
      return `#${setting.value}`
    case 'direction':
      return setting.value === 'SHORT' ? t('bots.direction_short') : t('bots.direction_long')
    case 'volume_mode':
      if (setting.value === 'exponential') return t('bots.volume_exponential')
      if (setting.value === 'fixed') return t('bots.volume_fixed')
      return t('bots.volume_linear')
    case 'auto_restart':
      return setting.value ? t('common.yes') : t('common.no')
    case 'grid_step_percent':
      return `${setting.value}%`
    default:
      return String(setting.value)
  }
}
</script>

<style scoped>
.creation-history {
  padding: 24px;
}

.creation-history__title {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 700;
}

.creation-history__hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.creation-history__state {
  margin: 0;
  padding: 24px 8px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.creation-history__state--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-danger);
}

.creation-history__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 640px;
  overflow-y: auto;
}

.creation-history__item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.creation-history__item--selected {
  box-shadow: var(--shadow-inset-sm);
  outline: 2px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.creation-history__item-body {
  min-width: 0;
}

.creation-history__copy-btn {
  align-self: stretch;
}

.creation-history__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.creation-history__symbol {
  font-weight: 700;
  font-size: 0.95rem;
}

.creation-history__outcome {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.creation-history__outcome--created_ok {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.creation-history__outcome--exchange_error {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.creation-history__outcome--validation_failed {
  color: var(--color-text-muted);
  background: var(--color-surface-alt);
}

.creation-history__meta {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.creation-history__settings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.creation-history__setting {
  min-width: 0;
}

.creation-history__setting-label {
  margin: 0 0 2px;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.3;
}

.creation-history__setting-value {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.creation-history__error {
  margin: 8px 0 0;
  color: var(--color-danger);
  font-size: 0.78rem;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .creation-history__settings {
    grid-template-columns: 1fr;
  }
}
</style>
