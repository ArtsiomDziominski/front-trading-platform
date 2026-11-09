<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { formatDateTime, formatUsdt } from '~/utils/formatNumber'

/** Cumulative PnL of a backtest (open position marked at candle closes): one line, zero line, hover readout. */
const props = withDefaults(defineProps<{
  points: { t: string, pnl: number | null }[]
  height?: number
  ariaLabel?: string
}>(), {
  height: 220,
  ariaLabel: '',
})

const { locale } = useI18n()

const PAD_TOP = 12
const PAD_BOTTOM = 22
const PAD_LEFT = 4
const PAD_RIGHT = 4

const frameRef = ref<HTMLElement | null>(null)
const { width } = useElementSize(frameRef)

const series = computed(() => props.points
  .map(point => ({ time: Date.parse(point.t), pnl: point.pnl }))
  .filter((point): point is { time: number, pnl: number } => Number.isFinite(point.time) && point.pnl != null && Number.isFinite(point.pnl)))

const layout = computed(() => {
  const list = series.value
  const w = Math.max(width.value, 1)
  const plotW = Math.max(1, w - PAD_LEFT - PAD_RIGHT)
  const plotH = Math.max(1, props.height - PAD_TOP - PAD_BOTTOM)
  const values = list.map(point => point.pnl)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const first = list[0]?.time ?? 0
  const last = list.at(-1)?.time ?? first + 1
  const tSpan = last - first || 1
  const x = (time: number) => PAD_LEFT + ((time - first) / tSpan) * plotW
  const y = (value: number) => PAD_TOP + ((max - value) / span) * plotH
  return { w, plotW, plotH, min, max, x, y, first, last }
})

const linePath = computed(() => {
  const { x, y } = layout.value
  return series.value.map((point, index) => `${index ? 'L' : 'M'}${x(point.time).toFixed(1)},${y(point.pnl).toFixed(1)}`).join('')
})

const areaPath = computed(() => {
  const list = series.value
  if (!list.length) return ''
  const { x, y } = layout.value
  const zero = y(0).toFixed(1)
  return `${linePath.value}L${x(list.at(-1)!.time).toFixed(1)},${zero}L${x(list[0]!.time).toFixed(1)},${zero}Z`
})

const tone = computed(() => ((series.value.at(-1)?.pnl ?? 0) >= 0 ? 'up' : 'down'))
const zeroY = computed(() => layout.value.y(0))

const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }))
const axisLabels = computed(() => {
  const { first, last } = layout.value
  if (!series.value.length) return []
  return [
    { id: 'start', text: dateFormat.value.format(first), align: 'start' },
    { id: 'end', text: dateFormat.value.format(last), align: 'end' },
  ]
})

const hoverIndex = ref<number | null>(null)

function onMove(event: PointerEvent) {
  const list = series.value
  const el = frameRef.value
  if (!list.length || !el) return
  const rect = el.getBoundingClientRect()
  const { first, last, plotW } = layout.value
  const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left - PAD_LEFT) / plotW))
  const time = first + fraction * (last - first)
  let best = 0
  for (let i = 1; i < list.length; i += 1) {
    if (Math.abs(list[i]!.time - time) < Math.abs(list[best]!.time - time)) best = i
  }
  hoverIndex.value = best
}

const hover = computed(() => {
  const index = hoverIndex.value
  const point = index == null ? null : series.value[index]
  if (!point) return null
  const { x, y, w } = layout.value
  const px = x(point.time)
  return {
    x: px,
    y: y(point.pnl),
    left: px > w / 2,
    value: `${formatUsdt(point.pnl, locale.value, true)} USDT`,
    time: formatDateTime(new Date(point.time).toISOString(), locale.value),
  }
})
</script>

<template>
  <div
    ref="frameRef"
    class="equity-chart"
    :style="{ height: `${height}px` }"
    role="img"
    :aria-label="ariaLabel"
    @pointermove="onMove"
    @pointerleave="hoverIndex = null"
  >
    <svg v-if="series.length > 1" :width="layout.w" :height="height" :viewBox="`0 0 ${layout.w} ${height}`" aria-hidden="true">
      <line class="equity-chart__zero" :x1="PAD_LEFT" :x2="layout.w - PAD_RIGHT" :y1="zeroY" :y2="zeroY" />
      <path :class="`equity-chart__area equity-chart__area--${tone}`" :d="areaPath" />
      <path :class="`equity-chart__line equity-chart__line--${tone}`" :d="linePath" />
      <g v-if="hover">
        <line class="equity-chart__cursor" :x1="hover.x" :x2="hover.x" :y1="PAD_TOP" :y2="height - PAD_BOTTOM" />
        <circle :class="`equity-chart__dot equity-chart__dot--${tone}`" :cx="hover.x" :cy="hover.y" r="3.5" />
      </g>
    </svg>
    <span class="equity-chart__label equity-chart__label--max">{{ formatUsdt(layout.max, locale, true) }}</span>
    <span class="equity-chart__label equity-chart__label--min" :style="{ bottom: `${PAD_BOTTOM}px` }">{{ formatUsdt(layout.min, locale, true) }}</span>
    <span
      v-for="label in axisLabels"
      :key="label.id"
      class="equity-chart__axis"
      :class="`equity-chart__axis--${label.align}`"
    >{{ label.text }}</span>
    <div
      v-if="hover"
      class="equity-chart__tip"
      :style="hover.left ? { right: `${layout.w - hover.x + 10}px` } : { left: `${hover.x + 10}px` }"
    >
      <strong :class="`tone-${tone}`">{{ hover.value }}</strong>
      <span>{{ hover.time }}</span>
    </div>
  </div>
</template>

<style scoped>
.equity-chart {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgb(255 255 255 / 3%);
  touch-action: pan-y;
}

.equity-chart svg {
  display: block;
}

.equity-chart__zero {
  stroke: rgb(255 255 255 / 22%);
  stroke-dasharray: 3 4;
  stroke-width: 1;
}

.equity-chart__line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
}

.equity-chart__line--up {
  stroke: var(--color-up);
}

.equity-chart__line--down {
  stroke: var(--color-down);
}

.equity-chart__area--up {
  fill: var(--color-up);
  opacity: 0.1;
}

.equity-chart__area--down {
  fill: var(--color-down);
  opacity: 0.1;
}

.equity-chart__cursor {
  stroke: rgb(255 255 255 / 30%);
  stroke-width: 1;
}

.equity-chart__dot--up {
  fill: var(--color-up);
}

.equity-chart__dot--down {
  fill: var(--color-down);
}

.equity-chart__label,
.equity-chart__axis {
  position: absolute;
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.equity-chart__label {
  left: 8px;
}

.equity-chart__label--max {
  top: 4px;
}

.equity-chart__axis {
  bottom: 4px;
}

.equity-chart__axis--start {
  left: 8px;
}

.equity-chart__axis--end {
  right: 8px;
}

.equity-chart__tip {
  position: absolute;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 9px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  background: rgb(13 13 18 / 92%);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

.equity-chart__tip span {
  color: var(--color-text-muted);
  font-size: 11px;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}
</style>
