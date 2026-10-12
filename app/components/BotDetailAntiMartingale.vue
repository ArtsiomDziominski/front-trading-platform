<script setup lang="ts">
import type { BotEventOut, BotListItem, CandleOut } from '#shared/types/bot'
import type { ChartLevel, ChartLine, ChartMarker } from '~/utils/candleChart'
import {
  candleContaining,
  deriveAmCurrentCycle,
  deriveAmCycles,
  deriveAmMarket,
  readAmConfig,
  type AmLegStatus,
  type AmLegView,
} from '~/utils/antiMartingaleState'
import { antiMartingaleLegIndex } from '~/utils/botEventType'
import { isInPosition, pnlTone } from '~/utils/botView'
import { formatDateTime, formatPercentValue, formatPrice, formatUsdt, toNumber } from '~/utils/formatNumber'

/** Anti-martingale part of the bot page: breakout chart, the current cycle ladder and past cycles. */
const props = defineProps<{
  bot: BotListItem
  candles: CandleOut[]
  events: BotEventOut[]
  eventsLoaded: boolean
  eventsError: string | null
}>()

const { t, locale } = useI18n()

const config = computed(() => readAmConfig(props.bot.config))
const market = computed(() => deriveAmMarket(props.candles, config.value))
const cycles = computed(() => deriveAmCycles(props.events, config.value, props.candles))
const current = computed(() => deriveAmCurrentCycle(props.bot, config.value, props.candles, props.events, cycles.value))
const inPosition = computed(() => isInPosition(props.bot))
const cycleActive = computed(() => current.value.active)
/** The open cycle's entry is known best from the position, so the table and markers reuse the ladder's value. */
const cycleList = computed(() => cycles.value.map((cycle) => {
  const open = current.value
  if (cycle.configVersion !== props.bot.config_version || !open.active || open.firstEntryPrice == null) return cycle
  return { ...cycle, firstEntryPrice: open.firstEntryPrice, firstEntryApprox: open.firstEntryApprox }
}))
/** The engine bumps the version when a cycle starts; it starts at 1. */
const cyclesStarted = computed(() => Math.max(0, props.bot.config_version - 1))

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function approxPrice(value: number | null | undefined, approx: boolean) {
  if (value == null) return '—'
  return approx ? `≈ ${price(value)}` : price(value)
}

const chartLevels = computed<ChartLevel[]>(() => {
  const levels: ChartLevel[] = []
  if (!cycleActive.value && market.value.breakoutLevel != null) {
    levels.push({ id: 'breakout', price: market.value.breakoutLevel, label: t('bots.am_level_breakout'), tone: 'accent' })
  }
  if (inPosition.value && props.bot.entry_price != null) {
    levels.push({ id: 'entry', price: props.bot.entry_price, label: t('bots.am_level_entry'), tone: 'info' })
  }
  for (const leg of current.value.legs) {
    if (leg.index > 0 && leg.triggerPrice != null && (leg.status === 'placed' || leg.status === 'waiting')) {
      levels.push({
        id: `addon-${leg.index}`,
        price: leg.triggerPrice,
        label: t('bots.am_level_addon', { n: leg.index }),
        tone: 'up',
        dashed: true,
      })
    }
  }
  if (current.value.trailingStopPrice != null) {
    levels.push({
      id: 'trailing',
      price: current.value.trailingStopPrice,
      label: t('bots.am_level_trailing'),
      tone: 'down',
      dashed: true,
    })
  }
  return levels
})

const chartLines = computed<ChartLine[]>(() => [
  { id: 'ema-fast', label: `EMA ${config.value.emaFastPeriod}`, values: market.value.emaFast, tone: 'warning' },
  { id: 'ema-slow', label: `EMA ${config.value.emaSlowPeriod}`, values: market.value.emaSlow, tone: 'muted' },
])

const chartMarkers = computed<ChartMarker[]>(() => {
  const markers: ChartMarker[] = []
  for (const cycle of cycleList.value) {
    const entryPrice = cycle.firstEntryPrice
    if (entryPrice != null) {
      markers.push({
        id: `cycle-${cycle.configVersion}-start`,
        time: cycle.startedAt,
        price: entryPrice,
        kind: 'entry',
        label: t('bots.am_marker_entry', { n: cycle.configVersion - 1 }),
      })
    }
    if (cycle.closedAt) {
      const exitPrice = cycle.exitPrice ?? candleContaining(props.candles, cycle.closedAt)?.close
      if (exitPrice != null) {
        markers.push({
          id: `cycle-${cycle.configVersion}-exit`,
          time: cycle.closedAt,
          price: exitPrice,
          kind: 'exit',
          label: t('bots.am_marker_exit', { n: cycle.configVersion - 1 }),
        })
      }
    }
  }
  for (const event of props.events) {
    if (event.event_type !== 'order_filled') continue
    const leg = antiMartingaleLegIndex(event.payload?.client_order_id)
    const fillPrice = toNumber(event.payload?.avg_price)
    if (leg == null || leg === 0 || fillPrice == null) continue
    markers.push({
      id: `fill-${event.id}`,
      time: event.created_at,
      price: fillPrice,
      kind: 'addon',
      label: t('bots.am_marker_addon', { n: leg }),
    })
  }
  return markers
})

const breakoutDistanceLabel = computed(() => {
  const distance = market.value.distanceToBreakoutPercent
  if (distance == null) return '—'
  if (distance <= 0) return t('bots.am_breakout_above')
  return t('bots.am_breakout_distance', { value: formatPercentValue(distance, locale.value) })
})

const trendLabel = computed(() => {
  if (market.value.trendUp == null) return '—'
  return market.value.trendUp ? t('bots.am_trend_up') : t('bots.am_trend_down')
})

// The page only has the breakout window; the engine seeds its EMAs from a longer history
const trendSub = computed(() => {
  if (market.value.lastEmaSlow == null) {
    return t('bots.am_ema_not_enough', { period: config.value.emaSlowPeriod, have: props.candles.length })
  }
  return `≈ ${price(market.value.lastEmaFast)} / ${price(market.value.lastEmaSlow)}`
})

const LEG_STATUS_KEYS: Record<AmLegStatus, string> = {
  filled: 'bots.am_leg_filled',
  placed: 'bots.am_leg_placed',
  rejected: 'bots.am_leg_rejected',
  waiting: 'bots.am_leg_waiting',
  cancelled: 'bots.am_leg_cancelled',
}

function legPrice(leg: AmLegView) {
  if (leg.fillPrice != null) return approxPrice(leg.fillPrice, leg.fillApprox)
  if (leg.status === 'cancelled') return '—'
  return approxPrice(leg.triggerPrice, true)
}

function formatDuration(from: string, to: string | null): string {
  const ms = (to ? Date.parse(to) : Date.now()) - Date.parse(from)
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return t('bots.duration_days_hours', { days, hours })
  if (hours > 0) return t('bots.duration_hours_minutes', { hours, minutes: minutes % 60 })
  return t('bots.duration_minutes', { minutes })
}

/** Past cycles with the price move from the first entry to the exit; there is no realized PnL per cycle. */
const cycleRows = computed(() => cycleList.value.map((cycle) => {
  const { firstEntryPrice: entry, exitPrice: exit } = cycle
  const change = entry != null && exit != null && entry > 0 ? ((exit - entry) / entry) * 100 : null
  return { ...cycle, change }
}))
</script>

<template>
  <div class="am-detail">
    <section class="detail-panel" :aria-labelledby="`am-chart-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`am-chart-${bot.id}`" class="detail-panel__title">{{ $t('bots.am_chart_title') }}</h2>
        <span v-if="market.lastCandleTime" class="detail-panel__note">
          {{ $t('bots.am_chart_last', { price: price(market.lastClose), time: formatDateTime(market.lastCandleTime, locale) }) }}
        </span>
      </div>

      <BotCandleChart
        v-if="candles.length"
        :candles="candles"
        :levels="chartLevels"
        :lines="chartLines"
        :markers="chartMarkers"
        :height="340"
        :aria-label="$t('bots.am_chart_aria', { symbol: bot.symbol })"
      />
      <p v-else class="detail-panel__empty">{{ $t('bots.am_chart_empty') }}</p>

      <dl class="am-detail__stats">
        <div class="am-detail__stat">
          <dt>{{ $t('bots.am_breakout_level') }}</dt>
          <dd>{{ price(market.breakoutLevel) }}</dd>
          <span class="am-detail__sub">
            {{ $t('bots.am_breakout_window', { hours: config.breakoutLookbackHours, candles: config.breakoutLookbackCandles }) }}
          </span>
        </div>
        <div class="am-detail__stat">
          <dt>{{ $t('bots.am_breakout_to') }}</dt>
          <dd>{{ breakoutDistanceLabel }}</dd>
          <span class="am-detail__sub">{{ $t('bots.am_breakout_from_close') }}</span>
        </div>
        <div class="am-detail__stat">
          <dt>{{ $t('bots.am_trend', { fast: config.emaFastPeriod, slow: config.emaSlowPeriod }) }}</dt>
          <dd :class="{ 'tone-up': market.trendUp === true, 'tone-down': market.trendUp === false }">{{ trendLabel }}</dd>
          <span class="am-detail__sub">{{ trendSub }}</span>
        </div>
        <div class="am-detail__stat">
          <dt>{{ $t('bots.am_cycles_started') }}</dt>
          <dd>{{ cyclesStarted }}</dd>
          <span class="am-detail__sub">{{ cycleActive ? $t('bots.am_cycle_open') : $t('bots.am_cycle_idle') }}</span>
        </div>
      </dl>

      <p class="detail-panel__hint">
        {{ $t('bots.am_entry_rule', { fast: config.emaFastPeriod, slow: config.emaSlowPeriod }) }}
        {{ $t('bots.am_ema_hint', { have: candles.length }) }}
        <template v-if="candles.length && !market.breakoutWindowComplete">
          {{ $t('bots.am_window_incomplete', { have: candles.length, need: config.breakoutLookbackCandles }) }}
        </template>
      </p>
    </section>

    <section class="detail-panel" :aria-labelledby="`am-cycle-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`am-cycle-${bot.id}`" class="detail-panel__title">
          {{ cycleActive ? $t('bots.am_current_cycle') : $t('bots.am_ladder') }}
        </h2>
        <span v-if="current.cycle" class="detail-panel__note">
          {{ $t('bots.am_cycle_since', { date: formatDateTime(current.cycle.startedAt, locale), duration: formatDuration(current.cycle.startedAt, null) }) }}
        </span>
      </div>

      <dl v-if="cycleActive" class="detail-list am-detail__cycle-list">
        <div class="detail-list__row">
          <dt>{{ $t('bots.am_start_balance') }}</dt>
          <dd>{{ current.cycle?.startBalance == null ? '—' : `${formatUsdt(current.cycle.startBalance, locale)} USDT` }}</dd>
        </div>
        <div class="detail-list__row">
          <dt>{{ $t('bots.am_first_entry') }}</dt>
          <dd>{{ approxPrice(current.firstEntryPrice, current.firstEntryApprox) }}</dd>
        </div>
        <div class="detail-list__row">
          <dt>{{ $t('bots.am_average_entry') }}</dt>
          <dd>{{ price(bot.entry_price) }}</dd>
        </div>
        <div class="detail-list__row">
          <dt :title="$t('bots.am_highest_hint')">{{ $t('bots.am_highest') }}</dt>
          <dd>{{ current.highestPrice == null ? '—' : `≈ ${price(current.highestPrice)}` }}</dd>
        </div>
        <div class="detail-list__row">
          <dt :title="$t('bots.am_trailing_hint')">{{ $t('bots.am_trailing', { percent: config.trailingStopPercent }) }}</dt>
          <dd class="tone-down">{{ current.trailingStopPrice == null ? '—' : `≈ ${price(current.trailingStopPrice)}` }}</dd>
        </div>
      </dl>
      <p v-else class="detail-panel__hint">{{ $t('bots.am_ladder_hint') }}</p>

      <div class="detail-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col">{{ $t('bots.am_col_order') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_trigger') }}</th>
              <th v-if="cycleActive" scope="col" class="num">{{ $t('bots.am_col_price') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_size') }}</th>
              <th v-if="cycleActive" scope="col" class="num">{{ $t('bots.am_col_notional') }}</th>
              <th v-if="cycleActive" scope="col">{{ $t('bots.am_col_status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leg in current.legs" :key="leg.index">
              <td>{{ leg.index === 0 ? $t('bots.am_leg_entry') : $t('bots.am_leg_addon', { n: leg.index }) }}</td>
              <td class="num" :data-label="$t('bots.am_col_trigger')">{{ leg.index === 0 ? $t('bots.am_leg_breakout') : `+${leg.triggerPercent}%` }}</td>
              <td v-if="cycleActive" class="num" :data-label="$t('bots.am_col_price')">{{ legPrice(leg) }}</td>
              <td class="num" :data-label="$t('bots.am_col_size')">{{ $t('bots.am_leg_size', { percent: leg.sizePercent }) }}</td>
              <td v-if="cycleActive" class="num" :data-label="$t('bots.am_col_notional')">{{ leg.notionalUsdt == null ? '—' : formatUsdt(leg.notionalUsdt, locale) }}</td>
              <td v-if="cycleActive" :data-label="$t('bots.am_col_status')">
                <span
                  class="am-detail__leg-status"
                  :class="`am-detail__leg-status--${leg.status}`"
                  :title="leg.rejectReason ?? undefined"
                >
                  {{ $t(LEG_STATUS_KEYS[leg.status]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="current.cycle?.reason" class="am-detail__reason">{{ current.cycle.reason }}</p>
      <p v-if="current.ordersCancelled" class="am-detail__cancelled" role="note">{{ $t('bots.am_orders_cancelled') }}</p>
      <p v-if="cycleActive" class="detail-panel__hint">{{ $t('bots.am_approx_hint') }}</p>
    </section>

    <section class="detail-panel" :aria-labelledby="`am-cycles-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`am-cycles-${bot.id}`" class="detail-panel__title">{{ $t('bots.am_cycles_title') }}</h2>
        <span v-if="eventsLoaded && cycles.length < cyclesStarted" class="detail-panel__note">
          {{ $t('bots.am_cycles_partial', { shown: cycles.length, total: cyclesStarted }) }}
        </span>
      </div>

      <div v-if="cycles.length" class="detail-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col">{{ $t('bots.am_col_cycle') }}</th>
              <th scope="col">{{ $t('bots.am_col_started') }}</th>
              <th scope="col">{{ $t('bots.am_col_duration') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_balance') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_entry') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_exit') }}</th>
              <th scope="col" class="num">{{ $t('bots.am_col_change') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cycle in cycleRows" :key="cycle.configVersion">
              <td :data-label="$t('bots.am_col_cycle')">{{ cycle.configVersion - 1 }}</td>
              <td :data-label="$t('bots.am_col_started')">{{ formatDateTime(cycle.startedAt, locale) }}</td>
              <td :data-label="$t('bots.am_col_duration')">{{ cycle.closedAt ? formatDuration(cycle.startedAt, cycle.closedAt) : $t('bots.am_cycle_running') }}</td>
              <td class="num" :data-label="$t('bots.am_col_balance')">{{ cycle.startBalance == null ? '—' : formatUsdt(cycle.startBalance, locale) }}</td>
              <td class="num" :data-label="$t('bots.am_col_entry')">{{ approxPrice(cycle.firstEntryPrice, cycle.firstEntryApprox) }}</td>
              <td class="num" :data-label="$t('bots.am_col_exit')">{{ approxPrice(cycle.exitPrice, true) }}</td>
              <td class="num" :class="`tone-${pnlTone(cycle.change)}`" :data-label="$t('bots.am_col_change')">
                {{ cycle.change == null ? '—' : formatPercentValue(cycle.change, locale, true) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="eventsError" class="detail-panel__empty am-detail__error" role="alert">{{ eventsError }}</p>
      <p v-else class="detail-panel__empty">
        {{ eventsLoaded ? $t('bots.am_cycles_empty') : $t('common.loading') }}
      </p>
      <p v-if="cycles.length" class="detail-panel__hint">{{ $t('bots.am_cycles_hint') }}</p>
    </section>
  </div>
</template>

<style scoped>
.am-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.am-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.am-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.am-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.am-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.am-detail__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.am-detail__cycle-list {
  max-width: 520px;
}

.am-detail__leg-status {
  display: inline-block;
  padding: 1px 8px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.am-detail__leg-status--filled {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.am-detail__leg-status--placed {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.am-detail__leg-status--rejected {
  border-color: var(--color-down-dim);
  color: var(--color-down);
  cursor: help;
}

.am-detail__leg-status--cancelled {
  text-decoration: line-through;
}

.am-detail__cancelled {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgb(245 166 35 / 35%);
  border-radius: 10px;
  background: rgb(245 166 35 / 8%);
  color: var(--color-warning);
  font-size: 0.85rem;
  line-height: 1.45;
}

.am-detail__error {
  color: var(--color-danger);
}

.am-detail__reason {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgb(255 255 255 / 4%);
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .am-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
