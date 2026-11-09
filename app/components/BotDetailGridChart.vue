<script setup lang="ts">
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import type { BotEventOut, BotListItem, GridChart, GridChartOrder, GridChartTimeframe } from '#shared/types/bot'
import type { ChartLevel, ChartMarker } from '~/utils/candleChart'
import { isInPosition } from '~/utils/botView'
import { formatDateTime, formatPercentValue, formatPrice, formatQuantity, toNumber } from '~/utils/formatNumber'
import { parseApiError } from '~/utils/parseApiError'

/**
 * Futures grid chart on the bot page: candles, the position's average entry, the price now and every order
 * of the grid that still waits on the exchange (levels, take profit, stop loss), with the fills as markers.
 */
const props = defineProps<{
  bot: BotListItem
  events: BotEventOut[]
}>()

const TIMEFRAMES: { value: GridChartTimeframe, minutes: number }[] = [
  { value: '15m', minutes: 15 },
  { value: '1h', minutes: 60 },
  { value: '4h', minutes: 240 },
]
const CHART_LIMIT = 160
const REFRESH_DEBOUNCE_MS = 1500
/** New candles and order moves are not pushed: poll while the page is open and the bot runs. */
const POLL_MS = 60_000

const { t, locale } = useI18n()
const { fetchGridChart } = useBots()

const timeframe = ref<GridChartTimeframe>('15m')
const chart = ref<GridChart | null>(null)
const loading = ref(false)
const loaded = ref(false)
const error = ref<string | null>(null)

let requestId = 0
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  const current = ++requestId
  loading.value = true
  try {
    const result = await fetchGridChart(props.bot.id, { timeframe: timeframe.value, limit: CHART_LIMIT })
    if (current !== requestId) return
    chart.value = result
    error.value = null
  } catch (e) {
    if (current !== requestId) return
    // Keep the last chart on screen; the error says it may be stale
    error.value = parseApiError(e, t('bots.grid_chart_load_error'))
  } finally {
    if (current === requestId) {
      loading.value = false
      loaded.value = true
    }
  }
}

function refresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void load()
  }, REFRESH_DEBOUNCE_MS)
}

watch(timeframe, () => {
  chart.value = chart.value ? { ...chart.value, candles: [] } : null
  loaded.value = false
  void load()
})

watch(() => props.bot.id, () => {
  chart.value = null
  loaded.value = false
  error.value = null
  void load()
})

// A fill, a restart of the grid or a stop moves the orders: reload them
const refreshTrigger = computed(() => [
  props.bot.lifecycle_status,
  props.bot.config_version,
  props.bot.position_size,
  props.bot.entry_price,
].join('|'))
watch(refreshTrigger, (next, previous) => {
  if (next !== previous) refresh()
})

const visibility = useDocumentVisibility()
const active = computed(() => props.bot.lifecycle_status === 'ACTIVE')
useIntervalFn(() => {
  if (active.value && visibility.value === 'visible') void load()
}, POLL_MS)

onMounted(() => {
  void load()
})

onScopeDispose(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
  requestId += 1
})

const intervalMinutes = computed(() => TIMEFRAMES.find(item => item.value === timeframe.value)?.minutes ?? 15)
const candles = computed(() => chart.value?.candles ?? [])
const orders = computed(() => (chart.value?.orders ?? []).filter(order => order.price != null))
const inPosition = computed(() => isInPosition(props.bot))
const lastClose = computed(() => candles.value.at(-1)?.close ?? null)
/** Mark price from the last engine tick; the last closed candle when there is none yet. */
const currentPrice = computed(() => props.bot.mark_price ?? lastClose.value)

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function orderLabel(order: GridChartOrder) {
  if (order.kind === 'take_profit') return t('bots.grid_chart_take_profit')
  if (order.kind === 'stop_loss') return t('bots.grid_chart_stop_loss')
  if (order.kind === 'entry') return t('bots.grid_chart_entry_order')
  return order.level == null ? t('bots.grid_chart_order') : t('bots.grid_chart_level', { n: order.level })
}

const chartLevels = computed<ChartLevel[]>(() => {
  const levels: ChartLevel[] = []
  if (currentPrice.value != null) {
    levels.push({ id: 'current', price: currentPrice.value, label: t('bots.grid_chart_current'), tone: 'accent' })
  }
  if (inPosition.value && props.bot.entry_price != null) {
    levels.push({ id: 'entry', price: props.bot.entry_price, label: t('bots.grid_chart_avg_entry'), tone: 'info' })
  }
  for (const order of orders.value) {
    const value = order.price as number
    if (order.kind === 'take_profit') {
      levels.push({ id: order.client_order_id, price: value, label: orderLabel(order), tone: 'up', dashed: true })
    } else if (order.kind === 'stop_loss') {
      levels.push({ id: order.client_order_id, price: value, label: orderLabel(order), tone: 'down', dashed: true })
    } else {
      levels.push({
        id: order.client_order_id,
        price: value,
        label: orderLabel(order),
        legend: t('bots.grid_chart_orders_legend'),
        tone: 'warning',
        dashed: true,
      })
    }
  }
  return levels
})

/** Entry and grid fills of the running grid (TP / SL fills close it and have no price in the event). */
const chartMarkers = computed<ChartMarker[]>(() => {
  const markers: ChartMarker[] = []
  const pattern = new RegExp(`^b${props.bot.id}v(\\d+)([eg])(\\d+)$`)
  for (const event of props.events) {
    if (event.event_type !== 'order_filled') continue
    const match = pattern.exec(String(event.payload?.client_order_id ?? ''))
    const fillPrice = toNumber(event.payload?.avg_price)
    if (!match || fillPrice == null || Number(match[1]) !== props.bot.config_version) continue
    const isEntry = match[2] === 'e'
    markers.push({
      id: `fill-${event.id}`,
      time: event.created_at,
      price: fillPrice,
      kind: isEntry ? 'entry' : 'addon',
      label: isEntry ? t('bots.grid_chart_marker_entry') : t('bots.grid_chart_marker_level', { n: Number(match[3]) + 1 }),
    })
  }
  return markers
})

function distancePercent(target: number | null | undefined) {
  const from = currentPrice.value
  if (target == null || from == null || from <= 0) return null
  return ((target - from) / from) * 100
}

function distanceLabel(target: number | null | undefined) {
  const value = distancePercent(target)
  return value == null ? '—' : formatPercentValue(value, locale.value, true)
}

/** The grid order the price reaches first. */
const nextGridOrder = computed(() => {
  const from = currentPrice.value
  if (from == null) return null
  let best: GridChartOrder | null = null
  for (const order of orders.value) {
    if (order.kind !== 'grid' || order.price == null) continue
    if (!best || Math.abs(order.price - from) < Math.abs((best.price as number) - from)) best = order
  }
  return best
})

const gridOrdersCount = computed(() => orders.value.filter(order => order.kind === 'grid').length)

const lastCandleTime = computed(() => candles.value.at(-1)?.timestamp ?? null)

function sideLabel(side: string) {
  if (side === 'BUY') return t('bots.grid_chart_side_buy')
  if (side === 'SELL') return t('bots.grid_chart_side_sell')
  return side
}
</script>

<template>
  <section class="detail-panel grid-chart" :aria-labelledby="`grid-chart-${bot.id}`">
    <div class="detail-panel__head grid-chart__head">
      <h2 :id="`grid-chart-${bot.id}`" class="detail-panel__title">{{ $t('bots.grid_chart_title') }}</h2>
      <div class="grid-chart__tf" role="group" :aria-label="$t('bots.grid_chart_timeframe')">
        <button
          v-for="item in TIMEFRAMES"
          :key="item.value"
          type="button"
          class="grid-chart__tf-button"
          :aria-pressed="timeframe === item.value"
          @click="timeframe = item.value"
        >
          {{ item.value }}
        </button>
      </div>
    </div>

    <BotCandleChart
      v-if="candles.length"
      :candles="candles"
      :levels="chartLevels"
      :markers="chartMarkers"
      :interval-minutes="intervalMinutes"
      :height="360"
      :aria-label="$t('bots.grid_chart_aria', { symbol: bot.symbol })"
    />
    <p v-else-if="error" class="detail-panel__empty grid-chart__error" role="alert">{{ error }}</p>
    <p v-else class="detail-panel__empty">{{ loaded && !loading ? $t('bots.am_chart_empty') : $t('common.loading') }}</p>

    <p v-if="error && candles.length" class="grid-chart__warning" role="alert">{{ error }}</p>
    <p v-if="chart?.orders_error" class="grid-chart__warning" role="alert">
      {{ $t('bots.grid_chart_orders_error') }}
    </p>

    <dl class="grid-chart__stats">
      <div class="grid-chart__stat">
        <dt>{{ $t('bots.grid_chart_current') }}</dt>
        <dd>{{ price(currentPrice) }}</dd>
        <span v-if="lastCandleTime" class="grid-chart__sub">
          {{ $t('bots.grid_chart_last_candle', { time: formatDateTime(lastCandleTime, locale) }) }}
        </span>
      </div>
      <div class="grid-chart__stat">
        <dt>{{ $t('bots.grid_chart_avg_entry') }}</dt>
        <dd>{{ inPosition ? price(bot.entry_price) : '—' }}</dd>
        <span class="grid-chart__sub">
          {{ inPosition ? $t('bots.grid_chart_from_current', { value: distanceLabel(bot.entry_price) }) : $t('bots.position_none') }}
        </span>
      </div>
      <div class="grid-chart__stat">
        <dt>{{ $t('bots.grid_chart_next_order') }}</dt>
        <dd>{{ price(nextGridOrder?.price) }}</dd>
        <span class="grid-chart__sub">
          {{ nextGridOrder ? $t('bots.grid_chart_from_current', { value: distanceLabel(nextGridOrder.price) }) : $t('bots.grid_chart_no_orders_short') }}
        </span>
      </div>
      <div class="grid-chart__stat">
        <dt>{{ $t('bots.grid_chart_waiting') }}</dt>
        <dd>{{ chart && !chart.orders_error ? gridOrdersCount : '—' }}</dd>
        <span class="grid-chart__sub">{{ $t('bots.grid_chart_waiting_sub') }}</span>
      </div>
    </dl>

    <div v-if="orders.length" class="detail-table-wrap">
      <table class="detail-table">
        <thead>
          <tr>
            <th scope="col">{{ $t('bots.grid_chart_col_order') }}</th>
            <th scope="col">{{ $t('bots.grid_chart_col_side') }}</th>
            <th scope="col" class="num">{{ $t('bots.grid_chart_col_price') }}</th>
            <th scope="col" class="num">{{ $t('bots.grid_chart_col_distance') }}</th>
            <th scope="col" class="num">{{ $t('bots.grid_chart_col_quantity') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.client_order_id">
            <td :class="`grid-chart__kind grid-chart__kind--${order.kind}`">{{ orderLabel(order) }}</td>
            <td :data-label="$t('bots.grid_chart_col_side')">{{ sideLabel(order.side) }}</td>
            <td class="num" :data-label="$t('bots.grid_chart_col_price')">{{ price(order.price) }}</td>
            <td class="num" :data-label="$t('bots.grid_chart_col_distance')">{{ distanceLabel(order.price) }}</td>
            <td class="num" :data-label="$t('bots.grid_chart_col_quantity')">
              {{ order.quantity == null ? '—' : formatQuantity(order.quantity, locale) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="chart && !chart.orders_error" class="detail-panel__hint">
      {{ active ? $t('bots.grid_chart_no_orders') : $t('bots.grid_chart_no_orders_stopped') }}
    </p>

    <p class="detail-panel__hint">{{ $t('bots.grid_chart_hint') }}</p>
  </section>
</template>

<style scoped>
.grid-chart__head {
  flex-wrap: wrap;
  gap: 10px;
}

.grid-chart__tf {
  display: inline-flex;
  padding: 2px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
}

.grid-chart__tf-button {
  min-width: 40px;
  padding: 3px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.grid-chart__tf-button[aria-pressed="true"] {
  background: rgb(255 255 255 / 10%);
  color: var(--color-text);
}

.grid-chart__tf-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.grid-chart__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.grid-chart__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.grid-chart__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.grid-chart__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.grid-chart__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.grid-chart__warning {
  margin: 0;
  padding: 8px 12px;
  border: 1px solid rgb(245 166 35 / 35%);
  border-radius: 10px;
  background: rgb(245 166 35 / 8%);
  color: var(--color-warning);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.grid-chart__error {
  color: var(--color-danger);
}

.grid-chart__kind--take_profit {
  color: var(--color-up);
}

.grid-chart__kind--stop_loss {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .grid-chart__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
