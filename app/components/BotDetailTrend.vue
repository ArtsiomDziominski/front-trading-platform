<script setup lang="ts">
import type { BotListItem, CandleOut } from '#shared/types/bot'
import type { ChartLevel, ChartLine, ChartMarker } from '~/utils/candleChart'
import { pnlTone, trendBotSide } from '~/utils/botView'
import { formatCount, formatDateTime, formatPercentValue, formatPrice, formatUsdt } from '~/utils/formatNumber'
import {
  formatR,
  readTrendConfig,
  timeframeMinutes,
  trendExitReasonLabel,
  trendPauseScopeLabel,
  trendReasonText,
  trendSideLabel,
  trendStateLabel,
  trendStateTone,
  trendStopSourceLabel,
} from '~/utils/trend'

/** Trend part of the bot page: state plaque, 1H chart with EMA / channels / stop, stats, trades, decisions. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const config = computed(() => readTrendConfig(props.bot.config))
const status = computed(() => props.bot.trend ?? null)
const side = computed(() => trendBotSide(props.bot))
const inPosition = computed(() => side.value != null)

const { chart, trades, stats, decisions, load, refresh } = useTrendBotData(() => props.bot.id)

// Reload what is not pushed when the strategy state moves: a new closed candle, an entry, an add, a stop move
const refreshTrigger = computed(() => {
  const value = status.value
  return [
    props.bot.lifecycle_status,
    props.bot.config_version,
    value?.state,
    value?.trade_id,
    value?.units,
    value?.stop_price,
    value?.last_evaluated_at,
  ].join('|')
})
watch(refreshTrigger, (next, previous) => {
  if (next !== previous) refresh()
})

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function dateTime(value: string | null | undefined) {
  return value ? formatDateTime(value, locale.value) : '—'
}

// --- State plaque ---

/** The plaque reason: params from the bot row, else from the newest decision with the same code. */
const reasonText = computed(() => {
  const value = status.value
  if (!value) return null
  const latest = decisions.data.value[0]
  const params = value.last_reason_params
    ?? (latest && latest.reason_code === value.last_reason_code ? latest.reason_params : null)
  return trendReasonText(t, locale.value, value.last_reason_code, params, value.last_reason)
})

const regimeLabel = computed(() => {
  const regime = status.value?.regime
  if (regime === 'LONG') return t('bots.trend_regime_long')
  if (regime === 'SHORT') return t('bots.trend_regime_short')
  return t('bots.trend_regime_none')
})

const adxLabel = computed(() => {
  const adx = status.value?.adx
  if (adx == null) return '—'
  return t('bots.trend_badge_adx_value', { adx: formatCount(adx, locale.value), min: formatCount(config.value.adx_min, locale.value) })
})

const sideways = computed(() => status.value?.adx != null && status.value.adx < config.value.adx_min)

const stopSource = computed(() => trendStopSourceLabel(t, status.value?.stop_source))

const pauseNote = computed(() => {
  const value = status.value
  if (!value) return null
  if (value.state === 'PAUSED_RISK' || value.paused_until) {
    const scope = trendPauseScopeLabel(t, value.pause_reason)
    return t('bots.trend_paused_until', {
      scope: scope ?? t('bots.trend_state_paused_risk'),
      until: dateTime(value.paused_until),
    })
  }
  if (value.state === 'COOLDOWN' || value.cooldown_until) {
    return t('bots.trend_cooldown_until', { until: dateTime(value.cooldown_until) })
  }
  return null
})

// --- Chart ---

/** Candles and the overlay values that belong to them, in the same order. */
const chartSeries = computed(() => {
  const points = (chart.data.value?.points ?? []).filter((point) =>
    point.open != null && point.high != null && point.low != null && point.close != null,
  )
  const candles: CandleOut[] = points.map((point) => ({
    timestamp: point.timestamp,
    open: point.open as number,
    high: point.high as number,
    low: point.low as number,
    close: point.close as number,
  }))
  return { points, candles }
})

const chartInterval = computed(() => timeframeMinutes(chart.data.value?.signal_timeframe ?? config.value.signal_timeframe))
const trendTimeframe = computed(() => chart.data.value?.trend_timeframe ?? config.value.trend_timeframe)

const chartLines = computed<ChartLine[]>(() => {
  const points = chartSeries.value.points
  const lines: ChartLine[] = [
    {
      id: 'ema-fast',
      label: `EMA ${config.value.ema_fast} (${trendTimeframe.value})`,
      values: points.map((point) => point.ema_fast),
      tone: 'warning',
    },
    {
      id: 'ema-slow',
      label: `EMA ${config.value.ema_slow} (${trendTimeframe.value})`,
      values: points.map((point) => point.ema_slow),
      tone: 'muted',
    },
    {
      id: 'entry-high',
      label: t('bots.trend_line_entry_high', { n: config.value.donchian_entry }),
      values: points.map((point) => point.entry_high),
      tone: 'up',
      dashed: true,
    },
    {
      id: 'entry-low',
      label: t('bots.trend_line_entry_low', { n: config.value.donchian_entry }),
      values: points.map((point) => point.entry_low),
      tone: 'down',
      dashed: true,
    },
  ]
  // The exit channel only matters on the side of the open position: min(Low) for a long, max(High) for a short
  if (side.value) {
    lines.push({
      id: 'exit',
      label: t('bots.trend_line_exit', { n: config.value.donchian_exit }),
      values: points.map((point) => (side.value === 'LONG' ? point.exit_low : point.exit_high)),
      tone: 'info',
      dashed: true,
    })
  }
  return lines
})

const chartLevels = computed<ChartLevel[]>(() => {
  const levels: ChartLevel[] = []
  const value = status.value
  const stop = inPosition.value ? (value?.stop_price ?? chart.data.value?.stop_price ?? null) : null
  if (stop != null) {
    levels.push({ id: 'stop', price: stop, label: t('bots.trend_level_stop'), tone: 'down' })
  }
  if (inPosition.value && value?.avg_price != null) {
    levels.push({ id: 'avg', price: value.avg_price, label: t('bots.trend_level_avg'), tone: 'info' })
  }
  if (inPosition.value && value?.next_add_price != null && value.units < value.max_units) {
    levels.push({ id: 'next-add', price: value.next_add_price, label: t('bots.trend_level_next_add'), tone: 'up', dashed: true })
  }
  return levels
})

const chartMarkers = computed<ChartMarker[]>(() => {
  const markers: ChartMarker[] = []
  ;(chart.data.value?.markers ?? []).forEach((marker, index) => {
    if (marker.price == null) return
    const sideLabel = marker.side ?? ''
    const id = `${marker.kind}-${marker.trade_id ?? 'x'}-${index}`
    if (marker.kind === 'entry') {
      markers.push({ id, time: marker.timestamp, price: marker.price, kind: 'entry', label: t('bots.trend_marker_entry', { side: sideLabel }) })
    }
    else if (marker.kind === 'add') {
      markers.push({ id, time: marker.timestamp, price: marker.price, kind: 'addon', label: t('bots.trend_marker_add', { side: sideLabel }) })
    }
    else if (marker.kind === 'exit') {
      markers.push({ id, time: marker.timestamp, price: marker.price, kind: 'exit', label: t('bots.trend_marker_exit', { reason: trendExitReasonLabel(t, marker.label) }) })
    }
  })
  return markers
})

const lastPoint = computed(() => chartSeries.value.points.at(-1) ?? null)
</script>

<template>
  <div class="trend-detail">
    <section class="detail-panel" :aria-labelledby="`trend-state-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`trend-state-${bot.id}`" class="detail-panel__title">{{ $t('bots.trend_state_title') }}</h2>
        <span v-if="status?.last_evaluated_at" class="detail-panel__note">
          {{ $t('bots.trend_last_evaluated', { time: dateTime(status.last_evaluated_at) }) }}
        </span>
      </div>

      <template v-if="status">
        <div class="trend-detail__plaque">
          <span class="trend-detail__state" :class="`trend-detail__state--${trendStateTone(status.state)}`">
            {{ trendStateLabel(t, status.state) }}
          </span>
          <span v-if="reasonText" class="trend-detail__reason">{{ reasonText }}</span>
        </div>

        <p v-if="pauseNote" class="trend-detail__pause" role="note">{{ pauseNote }}</p>

        <dl class="trend-detail__stats">
          <div class="trend-detail__stat">
            <dt>{{ $t('bots.trend_badge_regime') }} ({{ config.trend_timeframe }})</dt>
            <dd :class="{ 'tone-up': status.regime === 'LONG', 'tone-down': status.regime === 'SHORT' }">{{ regimeLabel }}</dd>
            <span class="trend-detail__sub">EMA {{ config.ema_fast }}/{{ config.ema_slow }}: {{ price(status.ema_fast) }} / {{ price(status.ema_slow) }}</span>
          </div>
          <div class="trend-detail__stat">
            <dt>ADX</dt>
            <dd :class="{ 'tone-warning': sideways }">{{ adxLabel }}</dd>
            <span v-if="sideways" class="trend-detail__sub">{{ $t('bots.trend_badge_sideways') }}</span>
          </div>
          <div class="trend-detail__stat">
            <dt>{{ $t('bots.trend_side') }}</dt>
            <dd :class="{ 'tone-up': side === 'LONG', 'tone-down': side === 'SHORT' }">{{ trendSideLabel(t, side) }}</dd>
            <span v-if="inPosition" class="trend-detail__sub">{{ $t('bots.trend_units') }}: {{ status.units }}/{{ status.max_units }}</span>
          </div>
          <div class="trend-detail__stat">
            <dt>ATR ({{ config.signal_timeframe }})</dt>
            <dd>{{ price(status.atr) }}</dd>
          </div>

          <template v-if="inPosition">
            <div class="trend-detail__stat">
              <dt>{{ $t('bots.trend_current_r') }}</dt>
              <dd :class="`tone-${pnlTone(status.current_r)}`">{{ formatR(status.current_r, locale) }}</dd>
              <span v-if="status.risk_usdt != null" class="trend-detail__sub">1R = {{ formatUsdt(status.risk_usdt, locale) }} USDT</span>
            </div>
            <div class="trend-detail__stat">
              <dt>{{ $t('bots.trend_level_stop') }}</dt>
              <dd class="tone-down">{{ price(status.stop_price) }}</dd>
              <span class="trend-detail__sub">
                {{ status.distance_to_stop_pct == null ? '' : $t('bots.trend_stop_distance_sub', { value: formatPercentValue(status.distance_to_stop_pct, locale) }) }}
                <template v-if="stopSource"> · {{ stopSource }}</template>
              </span>
            </div>
            <div class="trend-detail__stat">
              <dt>{{ $t('bots.trend_level_avg') }}</dt>
              <dd>{{ price(status.avg_price) }}</dd>
              <span class="trend-detail__sub">{{ $t('bots.trend_first_entry') }}: {{ price(status.entry_price) }}</span>
            </div>
            <div class="trend-detail__stat">
              <dt>{{ $t('bots.trend_level_next_add') }}</dt>
              <dd>{{ status.units < status.max_units ? price(status.next_add_price) : $t('bots.trend_pyramid_full') }}</dd>
              <span class="trend-detail__sub">{{ $t('bots.trend_initial_stop') }}: {{ price(status.initial_stop) }}</span>
            </div>
          </template>

          <div class="trend-detail__stat">
            <dt>{{ $t('bots.trend_capital') }}</dt>
            <dd>{{ status.capital == null ? '—' : `${formatUsdt(status.capital, locale)} USDT` }}</dd>
            <span v-if="status.equity != null" class="trend-detail__sub">{{ $t('bots.trend_equity') }}: {{ formatUsdt(status.equity, locale) }} USDT</span>
          </div>
        </dl>
      </template>
      <p v-else class="detail-panel__empty">{{ $t('bots.trend_state_empty') }}</p>
    </section>

    <section class="detail-panel" :aria-labelledby="`trend-chart-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`trend-chart-${bot.id}`" class="detail-panel__title">
          {{ $t('bots.trend_chart_title', { tf: chart.data.value?.signal_timeframe ?? config.signal_timeframe }) }}
        </h2>
        <span v-if="lastPoint" class="detail-panel__note">
          {{ $t('bots.am_chart_last', { price: price(lastPoint.close), time: dateTime(lastPoint.timestamp) }) }}
        </span>
      </div>

      <BotCandleChart
        v-if="chartSeries.candles.length"
        :candles="chartSeries.candles"
        :lines="chartLines"
        :levels="chartLevels"
        :markers="chartMarkers"
        :interval-minutes="chartInterval"
        :height="360"
        :aria-label="$t('bots.trend_chart_aria', { symbol: bot.symbol })"
      />
      <p v-else-if="chart.error.value" class="detail-panel__empty trend-detail__error" role="alert">{{ chart.error.value }}</p>
      <p v-else class="detail-panel__empty">{{ chart.loaded.value ? $t('bots.am_chart_empty') : $t('common.loading') }}</p>

      <p class="detail-panel__hint">
        {{ $t('bots.trend_chart_hint', { fast: config.ema_fast, slow: config.ema_slow, tf: config.trend_timeframe, entry: config.donchian_entry, exit: config.donchian_exit }) }}
      </p>
    </section>

    <BotDetailTrendStats
      :bot-id="bot.id"
      :stats="stats.data.value"
      :loaded="stats.loaded.value"
      :error="stats.error.value"
    />

    <BotDetailTrendTrades
      :bot-id="bot.id"
      :trades="trades.data.value"
      :loaded="trades.loaded.value"
      :error="trades.error.value"
    />

    <BotDetailTrendDecisions
      :bot-id="bot.id"
      :decisions="decisions.data.value"
      :loaded="decisions.loaded.value"
      :loading="decisions.loading.value"
      :error="decisions.error.value"
      @reload="load"
    />
  </div>
</template>

<style scoped>
.trend-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-detail__plaque {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.trend-detail__state {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.trend-detail__state--long {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.trend-detail__state--short {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.trend-detail__state--wait {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.trend-detail__state--pause {
  border-color: rgb(245 166 35 / 45%);
  color: var(--color-warning);
}

.trend-detail__reason {
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.trend-detail__pause {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgb(245 166 35 / 35%);
  border-radius: 10px;
  background: rgb(245 166 35 / 8%);
  color: var(--color-warning);
  font-size: 0.85rem;
  line-height: 1.45;
}

.trend-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.trend-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.trend-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.trend-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.trend-detail__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.trend-detail__error {
  color: var(--color-danger);
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

.tone-warning {
  color: var(--color-warning);
}

@media (max-width: 900px) {
  .trend-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
