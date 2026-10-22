<script setup lang="ts">
import { useElementSize, useEventListener } from '@vueuse/core'
import type { CandleOut } from '#shared/types/bot'
import {
  CHART_TONE_COLORS,
  candleBodyWidth,
  candleIndexAt,
  candlePaths,
  candleShape,
  clampToRange,
  crispPixel,
  estimateTextWidth,
  isFiniteCandle,
  formatCandleRange,
  formatChartDay,
  formatChartMoment,
  formatChartTime,
  indexAtX,
  linePath,
  niceTicks,
  priceDomain,
  priceToY,
  spreadLabels,
  timeTicks,
  yToPrice,
  type ChartLevel,
  type ChartLine,
  type ChartMarker,
} from '~/utils/candleChart'
import { formatPercentValue, formatPrice, priceFractionDigits } from '~/utils/formatNumber'

const props = withDefaults(defineProps<{
  candles: CandleOut[]
  levels?: ChartLevel[]
  markers?: ChartMarker[]
  lines?: ChartLine[]
  /** Plot plus time axis, px; the legend goes below it. */
  height?: number
  intervalMinutes?: number
  ariaLabel?: string
}>(), {
  levels: () => [],
  markers: () => [],
  lines: () => [],
  height: 320,
  intervalMinutes: 15,
  ariaLabel: undefined,
})

const TIME_AXIS_HEIGHT = 24
const TAG_HEIGHT = 18
const MIN_PLOT_WIDTH = 48
const MIN_PLOT_HEIGHT = 40
const TOOLTIP_GAP = 14
const MARKER_HALF_WIDTH = 4
const MARKER_HEIGHT = 6
const MARKER_GAP = 3
const MARKER_STEP = MARKER_HEIGHT + 2
const LIVE_DELAY_MS = 600
/** Share of the price scale the candles keep however far the levels are. */
const MIN_CANDLE_SHARE = 0.45

const { t, locale } = useI18n()
const hintId = useId()

const rootRef = useTemplateRef('rootRef')
const frameRef = useTemplateRef('frameRef')
const svgRef = useTemplateRef('svgRef')
const { width: frameWidth } = useElementSize(frameRef)

const chartLabel = computed(() => props.ariaLabel || t('bots.chart_aria_label'))
const clipId = useId()

// A candle with a missing or non-numeric price would break every path after it, so it is dropped once here
const chartCandles = computed(() => props.candles.filter(isFiniteCandle))
const chartLevels = computed(() => props.levels.filter(level => Number.isFinite(level.price)))
const intervalMs = computed(() => Math.max(1, props.intervalMinutes) * 60_000)
const plotHeight = computed(() => Math.max(0, props.height - TIME_AXIS_HEIGHT))

const series = computed(() => {
  const starts = chartCandles.value.map(candle => Date.parse(candle.timestamp))
  // Selection is keyed by open time, so a WebSocket refresh of the array keeps the crosshair on the same candle
  const indexByTime = new Map<number, number>()
  starts.forEach((time, index) => {
    if (Number.isFinite(time)) indexByTime.set(time, index)
  })
  return { starts, indexByTime }
})

const placedMarkers = computed(() => {
  const placed: { marker: ChartMarker, index: number }[] = []
  for (const marker of props.markers) {
    const index = candleIndexAt(series.value.starts, Date.parse(marker.time), intervalMs.value)
    if (index >= 0) placed.push({ marker, index })
  }
  return placed
})

const markersByIndex = computed(() => {
  const byIndex = new Map<number, ChartMarker[]>()
  for (const { marker, index } of placedMarkers.value) {
    const list = byIndex.get(index)
    if (list) list.push(marker)
    else byIndex.set(index, [marker])
  }
  return byIndex
})

/**
 * Levels far from the price (pending add-ons, a trailing stop) would squeeze the candles into a strip.
 * They widen the scale only while the candles keep MIN_CANDLE_SHARE of it; the rest are pinned to the edge.
 */
const scaledLevels = computed(() => {
  const count = chartCandles.value.length
  // Markers sit on their candle's wick, not at their own price, so they never widen the scale
  const extra: number[] = []
  for (const line of props.lines) {
    const length = Math.min(count, line.values.length)
    for (let index = 0; index < length; index++) {
      const value = line.values[index]
      if (value != null && Number.isFinite(value)) extra.push(value)
    }
  }
  const base = priceDomain(chartCandles.value, extra, 0)
  const inScale = new Set<string>()
  if (!base) return { extra, inScale }

  let low = base.min
  let high = base.max
  const maxSpan = (high - low) / MIN_CANDLE_SHARE
  const outside = (value: number) => Math.max(0, low - value, value - high)
  const ordered = [...chartLevels.value].sort((a, b) => outside(a.price) - outside(b.price))
  for (const level of ordered) {
    const nextLow = Math.min(low, level.price)
    const nextHigh = Math.max(high, level.price)
    if (nextHigh - nextLow > maxSpan) continue
    low = nextLow
    high = nextHigh
    inScale.add(level.id)
  }
  return { extra, inScale }
})

const domain = computed(() => {
  const { extra, inScale } = scaledLevels.value
  const levelPrices = chartLevels.value.filter(level => inScale.has(level.id)).map(level => level.price)
  return priceDomain(chartCandles.value, [...extra, ...levelPrices])
})

// One precision for the tooltip, tags and crosshair so their prices line up
const priceDigits = computed(() => {
  const digits = priceFractionDigits(chartCandles.value.at(-1)?.close ?? 0)
  return Number.isFinite(digits) ? digits : 2
})

function price(value: number): string {
  return formatPrice(value, locale.value, priceDigits.value)
}

const priceTicks = computed(() => {
  const range = domain.value
  if (!range) return { values: [], step: 0, digits: 0 }
  const maxCount = clampToRange(Math.floor(plotHeight.value / 48), 3, 6)
  return niceTicks(range.min, range.max, maxCount)
})

const tickLabels = computed(() => {
  const digits = Math.min(priceTicks.value.digits, 10)
  return priceTicks.value.values.map(value => formatPrice(value, locale.value, digits))
})

const levelPriceLabels = computed(() => {
  const range = domain.value
  return chartLevels.value.map((level) => {
    const text = price(level.price)
    if (!range || scaledLevels.value.inScale.has(level.id)) return text
    return `${level.price > range.max ? '▲' : '▼'} ${text}`
  })
})

const axisWidth = computed(() => {
  const range = domain.value
  const texts = [...tickLabels.value, ...levelPriceLabels.value]
  if (range) texts.push(price(range.min), price(range.max))
  const widest = Math.max(0, ...texts.map(text => estimateTextWidth(text)))
  return clampToRange(Math.ceil(widest + 16), 56, 96)
})

const layout = computed(() => {
  const range = domain.value
  const count = chartCandles.value.length
  const width = Math.floor(frameWidth.value)
  const plotWidth = width - axisWidth.value
  if (!range || !count || plotWidth < MIN_PLOT_WIDTH || plotHeight.value < MIN_PLOT_HEIGHT) return null
  return {
    width,
    plotWidth,
    plotHeight: plotHeight.value,
    count,
    slot: plotWidth / count,
    // min / max / height make the layout usable as the PriceScale itself
    min: range.min,
    max: range.max,
    height: plotHeight.value,
  }
})

const candleLayer = computed(() => {
  const scale = layout.value
  if (!scale) return null
  return candlePaths(chartCandles.value, scale.slot, value => priceToY(scale, value))
})

const lineLayer = computed(() => {
  const scale = layout.value
  if (!scale) return []
  return props.lines.map(line => ({
    id: line.id,
    color: CHART_TONE_COLORS[line.tone],
    d: linePath(line.values, scale.count, index => (index + 0.5) * scale.slot, value => priceToY(scale, value)),
  }))
})

const priceGrid = computed(() => {
  const scale = layout.value
  if (!scale) return []
  return priceTicks.value.values
    .map((value, index) => ({ value, y: priceToY(scale, value), label: tickLabels.value[index] ?? '' }))
    // Labels at the very edge would be cut in half
    .filter(tick => tick.y >= 6 && tick.y <= scale.plotHeight - 6)
    .map(tick => ({ ...tick, y: crispPixel(tick.y) }))
})

const timeGrid = computed(() => {
  const scale = layout.value
  if (!scale) return []
  const maxCount = clampToRange(Math.floor(scale.plotWidth / 56), 2, 7)
  const result: { index: number, x: number, label: string }[] = []
  let previousRight = -Infinity
  for (const tick of timeTicks(series.value.starts, props.intervalMinutes, maxCount)) {
    const label = tick.kind === 'day'
      ? formatChartDay(tick.time, locale.value)
      : tick.kind === 'dayTime'
        ? `${formatChartDay(tick.time, locale.value)} ${formatChartTime(tick.time, locale.value)}`
        : formatChartTime(tick.time, locale.value)
    const x = (tick.index + 0.5) * scale.slot
    const half = estimateTextWidth(label) / 2
    if (x - half < 2 || x + half > scale.width - 2 || x - half < previousRight + 8) continue
    result.push({ index: tick.index, x: crispPixel(x), label })
    previousRight = x + half
  }
  return result
})

const levelLayer = computed(() => {
  const scale = layout.value
  if (!scale) return []
  const ys = chartLevels.value.map(level => clampToRange(priceToY(scale, level.price), 0, scale.plotHeight))
  const tagYs = spreadLabels(ys, TAG_HEIGHT + 2, TAG_HEIGHT / 2, scale.plotHeight - TAG_HEIGHT / 2)
  return chartLevels.value.map((level, index) => ({
    id: level.id,
    // Off the scale: no line across the plot, only the tag pinned to the edge with an arrow
    offScale: !scaledLevels.value.inScale.has(level.id),
    y: crispPixel(ys[index] ?? 0),
    tagY: Math.round(tagYs[index] ?? 0),
    color: CHART_TONE_COLORS[level.tone],
    dashed: Boolean(level.dashed),
    label: level.label,
    price: levelPriceLabels.value[index] ?? '',
  }))
})

const markerLayer = computed(() => {
  const scale = layout.value
  if (!scale) return []
  const bodyWidth = candleBodyWidth(scale.slot)
  const result: { id: string, kind: ChartMarker['kind'], d: string }[] = []
  for (const [index, markers] of markersByIndex.value) {
    const candle = chartCandles.value[index]
    if (!candle) continue
    const shape = candleShape(candle, index, scale.slot, bodyWidth, value => priceToY(scale, value))
    const x = shape.wickX
    // Several events on one candle stack away from it: entries and add-ons below the low, exits above the high
    let below = 0
    let above = 0
    for (const marker of markers) {
      if (marker.kind === 'exit') {
        const tip = Math.max(MARKER_HEIGHT, shape.highY - MARKER_GAP - above * MARKER_STEP)
        result.push({ id: marker.id, kind: marker.kind, d: `M${x} ${tip}l${MARKER_HALF_WIDTH} ${-MARKER_HEIGHT}h${-MARKER_HALF_WIDTH * 2}Z` })
        above += 1
      }
      else {
        const tip = Math.min(scale.plotHeight - MARKER_HEIGHT, shape.lowY + MARKER_GAP + below * MARKER_STEP)
        result.push({ id: marker.id, kind: marker.kind, d: `M${x} ${tip}l${MARKER_HALF_WIDTH} ${MARKER_HEIGHT}h${-MARKER_HALF_WIDTH * 2}Z` })
        below += 1
      }
    }
  }
  return result
})

const legend = computed(() => [
  ...props.lines.map(line => ({ id: `line-${line.id}`, label: line.label, color: CHART_TONE_COLORS[line.tone], dashed: false })),
  ...chartLevels.value.map(level => ({ id: `level-${level.id}`, label: level.label, color: CHART_TONE_COLORS[level.tone], dashed: Boolean(level.dashed) })),
])

const selectedTime = ref<number | null>(null)
/** Pointer y inside the plot; null when the candle was picked from the keyboard (the crosshair then sits on the close). */
const pointerY = ref<number | null>(null)

const selectedIndex = computed(() => {
  if (selectedTime.value == null) return -1
  return series.value.indexByTime.get(selectedTime.value) ?? -1
})

const hover = computed(() => {
  const scale = layout.value
  const index = selectedIndex.value
  const candle = chartCandles.value[index]
  const start = series.value.starts[index]
  if (!scale || !candle || start == null) return null

  const shape = candleShape(candle, index, scale.slot, candleBodyWidth(scale.slot), value => priceToY(scale, value))
  const y = clampToRange(pointerY.value ?? priceToY(scale, candle.close), 0, scale.plotHeight)
  const timeLabel = formatChartMoment(start, locale.value)
  const timeTagWidth = Math.ceil(estimateTextWidth(timeLabel) + 14)
  return {
    shape,
    color: shape.rising ? 'var(--color-up)' : 'var(--color-down)',
    bandX: Math.floor(index * scale.slot),
    bandWidth: Math.max(1, Math.round(scale.slot)),
    crossY: crispPixel(y),
    pointerY: y,
    priceTagY: Math.round(clampToRange(y, TAG_HEIGHT / 2, scale.plotHeight - TAG_HEIGHT / 2)),
    priceLabel: price(yToPrice(scale, y)),
    timeLabel,
    timeTagWidth,
    timeTagX: Math.round(clampToRange(shape.wickX - timeTagWidth / 2, 0, scale.width - timeTagWidth)),
  }
})

function percentOf(part: number, base: number): number | null {
  return base ? (part / base) * 100 : null
}

/** Formatted content of the selected candle; independent of the pointer y, so it only changes with the selection. */
const selectedInfo = computed(() => {
  const index = selectedIndex.value
  const candle = chartCandles.value[index]
  const start = series.value.starts[index]
  if (!candle || start == null) return null

  const change = percentOf(candle.close - candle.open, candle.open)
  const range = percentOf(candle.high - candle.low, candle.low)
  return {
    title: formatCandleRange(start, intervalMs.value, locale.value),
    ohlc: [
      { key: 'open', label: t('bots.chart_ohlc_open'), value: price(candle.open) },
      { key: 'high', label: t('bots.chart_ohlc_high'), value: price(candle.high) },
      { key: 'low', label: t('bots.chart_ohlc_low'), value: price(candle.low) },
      { key: 'close', label: t('bots.chart_ohlc_close'), value: price(candle.close) },
    ],
    change: change == null ? '—' : formatPercentValue(change, locale.value, true),
    rising: candle.close >= candle.open,
    range: range == null ? '—' : formatPercentValue(range, locale.value),
    lines: props.lines.map((line) => {
      const value = line.values[index]
      return {
        id: line.id,
        label: line.label,
        color: CHART_TONE_COLORS[line.tone],
        value: value == null ? '—' : price(value),
      }
    }),
    markers: (markersByIndex.value.get(index) ?? []).map(marker => ({
      id: marker.id,
      kind: marker.kind,
      label: marker.label,
      price: price(marker.price),
    })),
  }
})

/**
 * Beside the candle when there is room. Otherwise (phones) at the plot edge farther from the candle,
 * on the half away from the candle itself, not from the finger, so it does not cover what is inspected.
 */
const tooltipStyle = computed(() => {
  const scale = layout.value
  const state = hover.value
  if (!scale || !state) return null

  const width = scale.width < 420 ? 172 : 200
  const x = state.shape.wickX
  const style: Record<string, string> = { width: `${width}px` }
  if (x + TOOLTIP_GAP + width <= scale.plotWidth) {
    style.left = `${Math.round(x + TOOLTIP_GAP)}px`
    style.top = '8px'
  }
  else if (x - TOOLTIP_GAP - width >= 0) {
    style.left = `${Math.round(x - TOOLTIP_GAP - width)}px`
    style.top = '8px'
  }
  else {
    const left = x < scale.plotWidth / 2 ? scale.plotWidth - width - 4 : 4
    style.left = `${Math.round(clampToRange(left, 4, scale.width - width - 4))}px`
    const candleMiddle = (state.shape.highY + state.shape.lowY) / 2
    if (candleMiddle < scale.plotHeight / 2) style.bottom = `${TIME_AXIS_HEIGHT + 8}px`
    else style.top = '8px'
  }
  return style
})

const liveSummary = computed(() => {
  const info = selectedInfo.value
  if (!info) return ''
  const [open, high, low, close] = info.ohlc.map(row => row.value)
  return t('bots.chart_live_summary', { time: info.title, open, high, low, close, change: info.change })
})

const liveText = ref('')
let liveTimer: ReturnType<typeof setTimeout> | undefined

// Screen readers hear the candle once the selection settles, not on every pointer frame
watch(liveSummary, (text) => {
  clearTimeout(liveTimer)
  liveTimer = setTimeout(() => {
    liveText.value = text
  }, LIVE_DELAY_MS)
})

let rafId = 0
let pending: { clientX: number, clientY: number, pointerType: string } | null = null

function clearSelection() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  pending = null
  selectedTime.value = null
  pointerY.value = null
}

function selectIndex(index: number) {
  const time = series.value.starts[index]
  if (time == null || !Number.isFinite(time)) return
  selectedTime.value = time
  pointerY.value = null
}

function applyPointer(clientX: number, clientY: number, pointerType: string) {
  const scale = layout.value
  const svg = svgRef.value
  if (!scale || !svg) return
  const rect = svg.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  // A finger keeps the crosshair while it drifts onto the axes; a mouse there means "not on the plot"
  if (pointerType === 'mouse' && (x < 0 || x > scale.plotWidth || y < 0 || y > scale.plotHeight)) {
    clearSelection()
    return
  }
  const time = series.value.starts[indexAtX(clampToRange(x, 0, scale.plotWidth - 0.01), scale.slot, scale.count)]
  if (time == null || !Number.isFinite(time)) return
  selectedTime.value = time
  pointerY.value = clampToRange(y, 0, scale.plotHeight)
}

function flushPointer() {
  rafId = 0
  const next = pending
  pending = null
  if (next) applyPointer(next.clientX, next.clientY, next.pointerType)
}

function onPointerMove(event: PointerEvent) {
  pending = { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType }
  if (!rafId) rafId = requestAnimationFrame(flushPointer)
}

function onPointerDown(event: PointerEvent) {
  // Touch selects on drag or release, so starting a vertical scroll on the chart does not flash the tooltip
  if (event.pointerType !== 'touch') applyPointer(event.clientX, event.clientY, event.pointerType)
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerType === 'touch') applyPointer(event.clientX, event.clientY, event.pointerType)
}

function onPointerLeave(event: PointerEvent) {
  // Touch fires leave on every lift; the tooltip stays until a tap elsewhere
  if (event.pointerType !== 'touch') clearSelection()
}

useEventListener('pointerdown', (event: PointerEvent) => {
  if (selectedTime.value == null) return
  const root = rootRef.value
  if (root && event.target instanceof Node && root.contains(event.target)) return
  clearSelection()
}, { passive: true })

function onKeydown(event: KeyboardEvent) {
  const count = chartCandles.value.length
  if (!count) return
  const current = selectedIndex.value
  const step = event.shiftKey ? 10 : 1
  let next: number
  switch (event.key) {
    case 'ArrowLeft':
      next = current < 0 ? count - 1 : current - step
      break
    case 'ArrowRight':
      next = current < 0 ? count - 1 : current + step
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = count - 1
      break
    case 'Escape':
      if (current < 0) return
      event.preventDefault()
      clearSelection()
      return
    default:
      return
  }
  event.preventDefault()
  selectIndex(clampToRange(next, 0, count - 1))
}

function onFocus(event: FocusEvent) {
  // A click focuses the chart as well; only keyboard focus should open the last candle
  if (event.currentTarget instanceof Element && !event.currentTarget.matches(':focus-visible')) return
  if (selectedIndex.value < 0) selectIndex(chartCandles.value.length - 1)
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  clearTimeout(liveTimer)
})
</script>

<template>
  <div v-if="candles.length" ref="rootRef" class="candle-chart">
    <div ref="frameRef" class="candle-chart__frame" :style="{ height: `${height}px` }">
      <svg
        v-if="layout"
        ref="svgRef"
        class="candle-chart__svg"
        :width="layout.width"
        :height="height"
        :viewBox="`0 0 ${layout.width} ${height}`"
        role="application"
        :aria-roledescription="$t('bots.chart_role')"
        :aria-label="chartLabel"
        :aria-describedby="hintId"
        tabindex="0"
        @pointermove="onPointerMove"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointerleave="onPointerLeave"
        @pointercancel="clearSelection"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="clearSelection"
      >
        <g class="candle-chart__grid" shape-rendering="crispEdges">
          <line
            v-for="tick in priceGrid"
            :key="`price-${tick.value}`"
            x1="0"
            :x2="layout.plotWidth"
            :y1="tick.y"
            :y2="tick.y"
          />
          <line
            v-for="tick in timeGrid"
            :key="`time-${tick.index}`"
            :x1="tick.x"
            :x2="tick.x"
            y1="0"
            :y2="layout.plotHeight"
          />
        </g>
        <g class="candle-chart__axis-line" shape-rendering="crispEdges">
          <line :x1="layout.plotWidth + 0.5" :x2="layout.plotWidth + 0.5" y1="0" :y2="layout.plotHeight" />
          <line x1="0" :x2="layout.width" :y1="layout.plotHeight + 0.5" :y2="layout.plotHeight + 0.5" />
        </g>

        <rect
          v-if="hover"
          class="candle-chart__band"
          :x="hover.bandX"
          y="0"
          :width="hover.bandWidth"
          :height="layout.plotHeight"
        />

        <defs>
          <clipPath :id="clipId">
            <rect x="0" y="0" :width="layout.plotWidth" :height="layout.plotHeight" />
          </clipPath>
        </defs>

        <g v-if="candleLayer" shape-rendering="crispEdges" :clip-path="`url(#${clipId})`">
          <path class="candle-chart__wick candle-chart__wick--up" :d="candleLayer.upWicks" />
          <path class="candle-chart__wick candle-chart__wick--down" :d="candleLayer.downWicks" />
          <path class="candle-chart__body candle-chart__body--up" :d="candleLayer.upBodies" />
          <path class="candle-chart__body candle-chart__body--down" :d="candleLayer.downBodies" />
        </g>

        <g :clip-path="`url(#${clipId})`">
          <path
            v-for="line in lineLayer"
            :key="line.id"
            class="candle-chart__line"
            :d="line.d"
            :style="{ stroke: line.color }"
          />
        </g>

        <g v-for="level in levelLayer" v-show="!level.offScale" :key="level.id">
          <line
            class="candle-chart__level"
            :class="{ 'candle-chart__level--dashed': level.dashed }"
            shape-rendering="crispEdges"
            x1="0"
            :x2="layout.plotWidth"
            :y1="level.y"
            :y2="level.y"
            :style="{ stroke: level.color }"
          />
          <text class="candle-chart__level-label" x="6" :y="level.tagY" dy="0.35em">{{ level.label }}</text>
        </g>

        <path
          v-for="marker in markerLayer"
          :key="marker.id"
          class="candle-chart__marker"
          :class="`candle-chart__marker--${marker.kind}`"
          :d="marker.d"
        />

        <g v-if="hover" class="candle-chart__hover">
          <line
            class="candle-chart__focus-wick"
            shape-rendering="crispEdges"
            :x1="hover.shape.wickX"
            :x2="hover.shape.wickX"
            :y1="hover.shape.highY"
            :y2="hover.shape.lowY"
            :style="{ stroke: hover.color }"
          />
          <rect
            class="candle-chart__focus-body"
            :x="hover.shape.x - 0.5"
            :y="hover.shape.bodyY - 0.5"
            :width="hover.shape.width + 1"
            :height="hover.shape.bodyHeight + 1"
            :style="{ fill: hover.color }"
          />
          <line
            class="candle-chart__crosshair"
            shape-rendering="crispEdges"
            :x1="hover.shape.wickX"
            :x2="hover.shape.wickX"
            y1="0"
            :y2="layout.plotHeight"
          />
          <line
            class="candle-chart__crosshair"
            shape-rendering="crispEdges"
            x1="0"
            :x2="layout.plotWidth"
            :y1="hover.crossY"
            :y2="hover.crossY"
          />
        </g>

        <g class="candle-chart__axis-text">
          <text
            v-for="tick in priceGrid"
            :key="`price-label-${tick.value}`"
            :x="layout.plotWidth + 8"
            :y="tick.y"
            dy="0.35em"
          >{{ tick.label }}</text>
          <text
            v-for="tick in timeGrid"
            :key="`time-label-${tick.index}`"
            :x="tick.x"
            :y="layout.plotHeight + TIME_AXIS_HEIGHT / 2"
            dy="0.35em"
            text-anchor="middle"
          >{{ tick.label }}</text>
        </g>

        <g v-for="level in levelLayer" :key="`tag-${level.id}`">
          <rect
            class="candle-chart__tag"
            :x="layout.plotWidth + 2"
            :y="level.tagY - TAG_HEIGHT / 2"
            :width="axisWidth - 4"
            :height="TAG_HEIGHT"
            rx="4"
            :style="{ fill: level.color }"
          />
          <text class="candle-chart__tag-text" :x="layout.plotWidth + 8" :y="level.tagY" dy="0.35em">{{ level.price }}</text>
        </g>

        <g v-if="hover">
          <rect
            class="candle-chart__cross-tag"
            :x="layout.plotWidth + 2"
            :y="hover.priceTagY - TAG_HEIGHT / 2"
            :width="axisWidth - 4"
            :height="TAG_HEIGHT"
            rx="4"
          />
          <text class="candle-chart__cross-tag-text" :x="layout.plotWidth + 8" :y="hover.priceTagY" dy="0.35em">{{ hover.priceLabel }}</text>
          <rect
            class="candle-chart__cross-tag"
            :x="hover.timeTagX"
            :y="layout.plotHeight + (TIME_AXIS_HEIGHT - TAG_HEIGHT) / 2"
            :width="hover.timeTagWidth"
            :height="TAG_HEIGHT"
            rx="4"
          />
          <text
            class="candle-chart__cross-tag-text"
            :x="hover.timeTagX + hover.timeTagWidth / 2"
            :y="layout.plotHeight + TIME_AXIS_HEIGHT / 2"
            dy="0.35em"
            text-anchor="middle"
          >{{ hover.timeLabel }}</text>
        </g>
      </svg>

      <div v-if="selectedInfo && tooltipStyle" class="candle-chart__tooltip" :style="tooltipStyle" aria-hidden="true">
        <div class="candle-chart__tooltip-title">{{ selectedInfo.title }}</div>
        <dl class="candle-chart__tooltip-rows">
          <template v-for="row in selectedInfo.ohlc" :key="row.key">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
          <dt>{{ t('bots.chart_change') }}</dt>
          <dd :class="selectedInfo.rising ? 'candle-chart__up' : 'candle-chart__down'">{{ selectedInfo.change }}</dd>
          <dt>{{ t('bots.chart_range') }}</dt>
          <dd>{{ selectedInfo.range }}</dd>
        </dl>
        <dl v-if="selectedInfo.lines.length" class="candle-chart__tooltip-rows candle-chart__tooltip-section">
          <template v-for="line in selectedInfo.lines" :key="line.id">
            <dt class="candle-chart__tooltip-key">
              <span class="candle-chart__swatch" :style="{ color: line.color }" />
              <span class="candle-chart__tooltip-label">{{ line.label }}</span>
            </dt>
            <dd>{{ line.value }}</dd>
          </template>
        </dl>
        <dl v-if="selectedInfo.markers.length" class="candle-chart__tooltip-rows candle-chart__tooltip-section">
          <template v-for="marker in selectedInfo.markers" :key="marker.id">
            <dt class="candle-chart__tooltip-key">
              <svg class="candle-chart__glyph" :class="`candle-chart__marker--${marker.kind}`" viewBox="0 0 8 7" width="8" height="7">
                <path :d="marker.kind === 'exit' ? 'M0 0H8L4 7Z' : 'M4 0L8 7H0Z'" />
              </svg>
              <span class="candle-chart__tooltip-label">{{ marker.label }}</span>
            </dt>
            <dd>{{ marker.price }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <ul v-if="legend.length" class="candle-chart__legend">
      <li v-for="item in legend" :key="item.id" class="candle-chart__legend-item">
        <span
          class="candle-chart__swatch"
          :class="{ 'candle-chart__swatch--dashed': item.dashed }"
          :style="{ color: item.color }"
          aria-hidden="true"
        />
        {{ item.label }}
      </li>
    </ul>

    <span :id="hintId" class="candle-chart__sr">{{ t('bots.chart_keyboard_hint') }}</span>
    <div class="candle-chart__sr" aria-live="polite" aria-atomic="true">{{ liveText }}</div>
  </div>
</template>

<style scoped>
.candle-chart {
  position: relative;
  min-width: 0;
}

.candle-chart__frame {
  position: relative;
  width: 100%;
  min-width: 0;
}

.candle-chart__svg {
  position: absolute;
  inset: 0 auto auto 0;
  display: block;
  overflow: visible;
  border-radius: 6px;
  touch-action: pan-y pinch-zoom;
  cursor: crosshair;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.candle-chart__svg:focus {
  outline: none;
}

.candle-chart__svg:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.candle-chart__grid line {
  stroke: rgb(255 255 255 / 6%);
  stroke-width: 1;
}

.candle-chart__axis-line line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.candle-chart__band {
  fill: var(--color-text);
  opacity: 0.05;
}

.candle-chart__wick {
  fill: none;
  stroke-width: 1;
}

.candle-chart__wick--up {
  stroke: var(--color-up);
}

.candle-chart__wick--down {
  stroke: var(--color-down);
}

.candle-chart__body--up {
  fill: var(--color-up);
}

.candle-chart__body--down {
  fill: var(--color-down);
}

.candle-chart__line {
  fill: none;
  stroke-width: 1.25;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.candle-chart__level {
  stroke-width: 1;
  opacity: 0.85;
}

.candle-chart__level--dashed {
  stroke-dasharray: 5 4;
}

.candle-chart__level-label {
  fill: var(--color-text-muted);
  font-size: 10.5px;
  paint-order: stroke;
  stroke: var(--color-surface);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.candle-chart__marker--entry {
  fill: var(--color-up);
}

.candle-chart__marker--addon {
  fill: var(--color-up-dim);
  stroke: var(--color-up);
  stroke-width: 1;
}

.candle-chart__marker--exit {
  fill: var(--color-down);
}

.candle-chart__focus-wick {
  stroke-width: 1;
}

.candle-chart__focus-body {
  stroke: var(--color-text);
  stroke-width: 1;
}

.candle-chart__crosshair {
  stroke: var(--color-text);
  stroke-width: 1;
  stroke-dasharray: 4 4;
  opacity: 0.4;
}

.candle-chart__axis-text text,
.candle-chart__tag-text,
.candle-chart__cross-tag-text {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.candle-chart__axis-text text {
  fill: var(--color-text-muted);
}

.candle-chart__tag-text {
  fill: var(--color-surface);
  font-weight: 600;
}

.candle-chart__cross-tag {
  fill: var(--color-surface-alt);
  stroke: var(--color-border);
  stroke-width: 1;
}

.candle-chart__cross-tag-text {
  fill: var(--color-text);
}

.candle-chart__tooltip {
  position: absolute;
  z-index: 2;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  font-size: 12px;
  line-height: 16px;
  pointer-events: none;
}

.candle-chart__tooltip-title {
  margin-bottom: 4px;
  color: var(--color-text-muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.candle-chart__tooltip-rows {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 12px;
  margin: 0;
}

.candle-chart__tooltip-rows dt {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.candle-chart__tooltip-rows dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.candle-chart__tooltip-section {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}

.candle-chart__tooltip-key {
  display: flex;
  align-items: center;
  gap: 6px;
}

.candle-chart__tooltip-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candle-chart__up {
  color: var(--color-up);
}

.candle-chart__down {
  color: var(--color-down);
}

.candle-chart__glyph {
  flex: none;
}

.candle-chart__swatch {
  flex: none;
  display: inline-block;
  width: 12px;
  height: 0;
  border-top: 2px solid currentcolor;
}

.candle-chart__swatch--dashed {
  border-top-style: dashed;
}

.candle-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 16px;
}

.candle-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.candle-chart__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 480px) {
  .candle-chart__tooltip {
    padding: 6px 8px;
    font-size: 11.5px;
    line-height: 15px;
  }
}
</style>
