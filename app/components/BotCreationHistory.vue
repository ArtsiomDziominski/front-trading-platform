<template>
  <NeumoCard variant="raised" class="creation-history">
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
      <NeumoButton variant="secondary" size="sm" @click="$emit('retry')">
        {{ $t('common.retry') }}
      </NeumoButton>
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
          <p v-if="item.error_message" class="creation-history__error">
            {{ item.error_message }}
          </p>
        </div>
        <NeumoButton
          variant="secondary"
          size="sm"
          class="creation-history__copy-btn"
          @click="$emit('select', item)"
        >
          {{ $t('bots.copy_settings') }}
        </NeumoButton>
      </li>
    </ul>

    <p v-else class="creation-history__state">
      {{ $t('bots.creation_history_empty') }}
    </p>
  </NeumoCard>
</template>

<script setup lang="ts">
import type { BotCreationLogOut, BotCreationOutcome } from '#shared/types/bot'

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
  max-height: 520px;
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

.creation-history__error {
  margin: 8px 0 0;
  color: var(--color-danger);
  font-size: 0.78rem;
  line-height: 1.4;
}
</style>
