<script setup lang="ts">
import type { TrendMarket } from '#shared/types/bot'
import type { TrendBadgeStatus } from '~/composables/useTrend'
import { formatCount, formatDateTime, formatPercentValue, formatPrice } from '~/utils/formatNumber'
import { trendReasonText, trendStateLabel } from '~/utils/trend'

/** Current trend of the selected pair on the trend create form: regime, ADX, distance to the breakout, state. */
const props = defineProps<{
  data: TrendMarket | null
  status: TrendBadgeStatus
  error: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t, locale } = useI18n()

const regimeLabel = computed(() => {
  const regime = props.data?.regime
  if (regime === 'LONG') return t('bots.trend_regime_long')
  if (regime === 'SHORT') return t('bots.trend_regime_short')
  return t('bots.trend_regime_none')
})

const regimeTone = computed(() => {
  const regime = props.data?.regime
  if (regime === 'LONG') return 'long'
  if (regime === 'SHORT') return 'short'
  return 'none'
})

const adxLabel = computed(() => {
  const data = props.data
  if (!data || data.adx == null) return '—'
  const value = formatCount(data.adx, locale.value)
  return data.adx_min == null ? value : t('bots.trend_badge_adx_value', { adx: value, min: formatCount(data.adx_min, locale.value) })
})

const breakoutLabel = computed(() => {
  const data = props.data
  if (!data) return '—'
  if (data.breakout) return t('bots.trend_badge_breakout_now')
  if (data.distance_to_breakout_pct == null) return '—'
  return formatPercentValue(data.distance_to_breakout_pct, locale.value, true)
})

const reasonText = computed(() => {
  const data = props.data
  if (!data) return ''
  return trendReasonText(t, locale.value, data.reason_code, data.reason_params, data.reason)
})

const note = computed(() => {
  const data = props.data
  if (!data) return ''
  const parts = [`${data.exchange} · ${data.signal_timeframe} / ${data.trend_timeframe}`]
  if (data.price != null) parts.push(formatPrice(data.price, locale.value))
  if (data.candle_close) parts.push(formatDateTime(data.candle_close, locale.value))
  return parts.join(' · ')
})
</script>

<template>
  <section class="trend-badge" :aria-label="$t('bots.trend_badge_title')" aria-live="polite">
    <div class="trend-badge__head">
      <span class="trend-badge__title">{{ $t('bots.trend_badge_title') }}</span>
      <span v-if="status === 'ready' && note" class="trend-badge__note">{{ note }}</span>
    </div>

    <p v-if="status === 'idle'" class="trend-badge__state">{{ $t('bots.trend_badge_idle') }}</p>
    <p v-else-if="status === 'invalid'" class="trend-badge__state">{{ $t('bots.trend_badge_invalid_symbol') }}</p>
    <p v-else-if="status === 'unsupported'" class="trend-badge__state">{{ $t('bots.trend_badge_unsupported') }}</p>
    <p v-else-if="status === 'loading' && !data" class="trend-badge__state" role="status">{{ $t('common.loading') }}</p>
    <div v-else-if="status === 'error'" class="trend-badge__state trend-badge__state--error" role="alert">
      <span>{{ error }}</span>
      <AppButton type="button" variant="secondary" size="sm" @click="emit('retry')">{{ $t('common.retry') }}</AppButton>
    </div>

    <template v-else-if="data">
      <dl class="trend-badge__grid" :class="{ 'trend-badge__grid--stale': status === 'loading' }">
        <div class="trend-badge__cell">
          <dt>{{ $t('bots.trend_badge_regime') }}</dt>
          <dd><span class="trend-badge__regime" :class="`trend-badge__regime--${regimeTone}`">{{ regimeLabel }}</span></dd>
        </div>
        <div class="trend-badge__cell">
          <dt>ADX</dt>
          <dd :class="{ 'trend-badge__warn': data.sideways }">{{ adxLabel }}</dd>
        </div>
        <div class="trend-badge__cell">
          <dt>{{ $t('bots.trend_badge_to_breakout') }}</dt>
          <dd>{{ breakoutLabel }}</dd>
        </div>
        <div class="trend-badge__cell">
          <dt>{{ $t('bots.trend_badge_state') }}</dt>
          <dd>{{ trendStateLabel(t, data.state) }}</dd>
        </div>
      </dl>

      <p v-if="data.sideways" class="trend-badge__sideways" role="note">
        <UIcon name="i-lucide-triangle-alert" aria-hidden="true" />
        {{ $t('bots.trend_badge_sideways') }}
      </p>
      <p v-if="reasonText" class="trend-badge__reason">{{ reasonText }}</p>
    </template>
  </section>
</template>

<style scoped>
.trend-badge {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.trend-badge__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.trend-badge__title {
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.trend-badge__note {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.trend-badge__state {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.trend-badge__state--error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: var(--color-danger);
}

.trend-badge__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  transition: opacity 0.15s ease;
}

.trend-badge__grid--stale {
  opacity: 0.6;
}

.trend-badge__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.trend-badge__cell dt {
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.trend-badge__cell dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.trend-badge__regime {
  display: inline-block;
  padding: 1px 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

.trend-badge__regime--long {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.trend-badge__regime--short {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.trend-badge__regime--none {
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.trend-badge__warn {
  color: var(--color-warning);
}

.trend-badge__sideways {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid rgb(245 166 35 / 35%);
  border-radius: 10px;
  background: rgb(245 166 35 / 8%);
  color: var(--color-warning);
  font-size: 0.85rem;
}

.trend-badge__reason {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .trend-badge__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
