<script setup lang="ts">
import type { CandleOut } from '#shared/types/bot'

const props = defineProps<{
  candles: CandleOut[]
}>()

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 160
const PADDING_Y = 8

interface CandleBar {
  x: number
  width: number
  wickTop: number
  wickBottom: number
  bodyTop: number
  bodyBottom: number
  bullish: boolean
}

const bars = computed<CandleBar[]>(() => {
  const candles = props.candles
  if (!candles.length) return []

  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const max = Math.max(...highs)
  const min = Math.min(...lows)
  const range = max - min || 1

  const slotWidth = VIEW_WIDTH / candles.length
  const bodyWidth = Math.max(slotWidth * 0.6, 1)

  function toY(price: number): number {
    const usable = VIEW_HEIGHT - PADDING_Y * 2
    return PADDING_Y + (1 - (price - min) / range) * usable
  }

  return candles.map((candle, index) => ({
    x: index * slotWidth + (slotWidth - bodyWidth) / 2,
    width: bodyWidth,
    wickTop: toY(candle.high),
    wickBottom: toY(candle.low),
    bodyTop: toY(Math.max(candle.open, candle.close)),
    bodyBottom: toY(Math.min(candle.open, candle.close)),
    bullish: candle.close >= candle.open,
  }))
})

const latestClose = computed(() => props.candles.at(-1)?.close ?? null)

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
})

function formatPrice(value: number): string {
  return priceFormatter.format(value)
}
</script>

<template>
  <div v-if="bars.length" class="candle-chart">
    <div class="candle-chart__head">
      <span class="candle-chart__title">{{ $t('bots.chart_title') }}</span>
      <span v-if="latestClose != null" class="candle-chart__price">{{ formatPrice(latestClose) }}</span>
    </div>
    <svg
      class="candle-chart__svg"
      :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="$t('bots.chart_title')"
    >
      <g v-for="(bar, index) in bars" :key="index">
        <line
          :x1="bar.x + bar.width / 2"
          :x2="bar.x + bar.width / 2"
          :y1="bar.wickTop"
          :y2="bar.wickBottom"
          class="candle-chart__wick"
          :class="bar.bullish ? 'candle-chart__wick--up' : 'candle-chart__wick--down'"
        />
        <rect
          :x="bar.x"
          :y="bar.bodyTop"
          :width="bar.width"
          :height="Math.max(bar.bodyBottom - bar.bodyTop, 1)"
          class="candle-chart__body"
          :class="bar.bullish ? 'candle-chart__body--up' : 'candle-chart__body--down'"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.candle-chart {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid var(--bento-border);
  border-radius: var(--radius-bento);
  background: var(--bento-surface);
}

.candle-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.candle-chart__title {
  color: var(--bento-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.candle-chart__price {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 0.85rem;
}

.candle-chart__svg {
  display: block;
  width: 100%;
  height: 120px;
}

.candle-chart__wick {
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.candle-chart__wick--up {
  stroke: var(--bento-accent, #22c55e);
}

.candle-chart__wick--down {
  stroke: var(--bento-danger, #f43f5e);
}

.candle-chart__body--up {
  fill: var(--bento-accent, #22c55e);
}

.candle-chart__body--down {
  fill: var(--bento-danger, #f43f5e);
}
</style>
