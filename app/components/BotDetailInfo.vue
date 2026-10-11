<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { exchangeDisplayName } from '#shared/utils/exchange-images'
import { BOT_TYPE_LABEL_KEYS, supportedExchange } from '~/utils/botView'
import { formatDateTime } from '~/utils/formatNumber'

/** Bookkeeping fields: ids, key, dates, version and raw engine state. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()
const { apiKeys } = useBots()

const apiKey = computed(() => apiKeys.value.find((key) => key.id === props.bot.api_key_id) ?? null)
const exchange = computed(() => supportedExchange(props.bot))

const ENGINE_STATE_KEYS: Record<BotListItem['engine_state'], string> = {
  INIT: 'bots.engine_state_init',
  RUNNING: 'bots.engine_state_running',
  STOPPED: 'bots.engine_state_stopped',
  RESTARTING: 'bots.engine_state_restarting',
  ERROR: 'bots.status_error',
}

const LIFECYCLE_KEYS: Record<BotListItem['lifecycle_status'], string> = {
  ACTIVE: 'bots.status_active',
  STOPPED: 'bots.status_stopped',
  CLOSED: 'bots.status_closed',
}

const typeLabel = computed(() => {
  const key = BOT_TYPE_LABEL_KEYS[props.bot.bot_type]
  return key ? t(key) : props.bot.bot_type
})
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`info-title-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`info-title-${bot.id}`" class="detail-panel__title">{{ $t('bots.detail_info') }}</h2>
    </div>
    <dl class="detail-list">
      <div class="detail-list__row">
        <dt>ID</dt>
        <dd>#{{ bot.id }}</dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.type') }}</dt>
        <dd>{{ typeLabel }}</dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.exchange') }}</dt>
        <dd>{{ exchange ? exchangeDisplayName(exchange) : bot.exchange ?? '—' }}</dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.field_api_key') }}</dt>
        <dd>
          <template v-if="apiKey">
            {{ apiKey.label || `#${apiKey.id}` }}
            <span class="info-panel__muted">{{ apiKey.api_key_masked }}</span>
          </template>
          <template v-else>#{{ bot.api_key_id }}</template>
        </dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.detail_lifecycle') }}</dt>
        <dd>{{ $t(LIFECYCLE_KEYS[bot.lifecycle_status]) }}</dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.detail_engine_state') }}</dt>
        <dd>{{ $t(ENGINE_STATE_KEYS[bot.engine_state]) }}</dd>
      </div>
      <div class="detail-list__row">
        <dt :title="$t('bots.detail_config_version_hint')">{{ $t('bots.detail_config_version') }}</dt>
        <dd>v{{ bot.config_version }}</dd>
      </div>
      <div class="detail-list__row">
        <dt>{{ $t('bots.detail_created_at') }}</dt>
        <dd>{{ formatDateTime(bot.created_at, locale) }}</dd>
      </div>
      <div v-if="bot.updated_at" class="detail-list__row">
        <dt>{{ $t('bots.detail_updated_at') }}</dt>
        <dd>{{ formatDateTime(bot.updated_at, locale) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.info-panel__muted {
  margin-left: 6px;
  color: var(--color-text-muted);
  font-weight: 500;
}
</style>
