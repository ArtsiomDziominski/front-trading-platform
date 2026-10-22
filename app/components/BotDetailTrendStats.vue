<script setup lang="ts">
import type { TrendStats } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import { formatCount, formatPercentValue, formatUsdt } from '~/utils/formatNumber'
import { formatR } from '~/utils/trend'

/** Closed-trade statistics of a trend bot (GET /bots/{id}/stats). */
const props = defineProps<{
  botId: number
  stats: TrendStats | null
  loaded: boolean
  error: string | null
}>()

const { locale } = useI18n()

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)} USDT`
}

function percent(value: number | null | undefined) {
  return value == null ? '—' : formatPercentValue(value, locale.value)
}

const profitFactor = computed(() => {
  const stats = props.stats
  if (!stats) return '—'
  if (stats.profit_factor != null) return formatCount(stats.profit_factor, locale.value)
  // The server sends null when there is no losing trade
  return stats.wins > 0 && stats.losses === 0 ? '∞' : '—'
})

const costs = computed(() => {
  const stats = props.stats
  if (!stats || (stats.fees == null && stats.funding == null)) return null
  return (stats.fees ?? 0) + (stats.funding ?? 0)
})

const monthFormat = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric', timeZone: 'UTC' }))

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? month : monthFormat.value.format(date)
}

/** Bar width for the month list, relative to the largest absolute month result. */
const months = computed(() => {
  const list = props.stats?.pnl_by_month ?? []
  const max = Math.max(0, ...list.map((item) => Math.abs(item.pnl_net ?? 0)))
  return list.map((item) => ({
    ...item,
    label: monthLabel(item.month),
    width: max > 0 && item.pnl_net != null ? Math.max(2, (Math.abs(item.pnl_net) / max) * 100) : 0,
  }))
})

</script>

<template>
  <section class="detail-panel" :aria-labelledby="`trend-stats-${botId}`">
    <div class="detail-panel__head">
      <h2 :id="`trend-stats-${botId}`" class="detail-panel__title">{{ $t('bots.trend_stats_title') }}</h2>
      <span v-if="error && stats" class="detail-panel__note trend-stats__error">{{ error }}</span>
    </div>

    <template v-if="stats">
      <p v-if="!stats.trades" class="detail-panel__empty">{{ $t('bots.trend_stats_empty') }}</p>

      <dl v-else class="trend-stats__grid">
        <div class="trend-stats__cell">
          <dt>{{ $t('bots.trend_stats_pnl') }}</dt>
          <dd class="trend-stats__big" :class="`tone-${pnlTone(stats.pnl_net)}`">{{ usdt(stats.pnl_net, true) }}</dd>
          <span class="trend-stats__sub">{{ $t('bots.trend_stats_gross') }}: {{ usdt(stats.pnl_gross, true) }}</span>
        </div>
        <div class="trend-stats__cell">
          <dt>{{ $t('bots.trend_stats_win_rate') }}</dt>
          <dd>{{ percent(stats.win_rate_pct) }}</dd>
          <span class="trend-stats__sub">{{ $t('bots.trend_stats_trades', { trades: stats.trades, wins: stats.wins, losses: stats.losses }) }}</span>
        </div>
        <div class="trend-stats__cell">
          <dt>{{ $t('bots.trend_stats_avg_r') }}</dt>
          <dd :class="`tone-${pnlTone(stats.avg_r)}`">{{ formatR(stats.avg_r, locale) }}</dd>
        </div>
        <div class="trend-stats__cell">
          <dt :title="$t('bots.trend_stats_profit_factor_hint')">{{ $t('bots.trend_stats_profit_factor') }}</dt>
          <dd>{{ profitFactor }}</dd>
        </div>
        <div class="trend-stats__cell">
          <dt :title="$t('bots.trend_stats_drawdown_hint')">{{ $t('bots.trend_stats_drawdown') }}</dt>
          <dd>{{ percent(stats.max_drawdown_pct) }}</dd>
          <span class="trend-stats__sub">{{ usdt(stats.max_drawdown_usdt) }}</span>
        </div>
        <div class="trend-stats__cell">
          <dt :title="$t('bots.trend_stats_costs_hint')">{{ $t('bots.trend_stats_costs_share') }}</dt>
          <dd>{{ percent(stats.costs_share_pct) }}</dd>
          <span class="trend-stats__sub">{{ $t('bots.trend_stats_costs', { fees: usdt(stats.fees, true), funding: usdt(stats.funding, true) }) }}</span>
        </div>
        <div class="trend-stats__cell">
          <dt>{{ $t('bots.trend_stats_costs_total') }}</dt>
          <dd :class="`tone-${pnlTone(costs)}`">{{ usdt(costs, true) }}</dd>
        </div>
        <div class="trend-stats__cell">
          <dt>{{ $t('bots.trend_stats_capital') }}</dt>
          <dd>{{ usdt(stats.capital) }}</dd>
        </div>
      </dl>

      <div v-if="months.length" class="trend-stats__months">
        <h3 class="trend-stats__months-title">{{ $t('bots.trend_stats_by_month') }}</h3>
        <ul class="trend-stats__month-list">
          <li v-for="item in months" :key="item.month" class="trend-stats__month">
            <span class="trend-stats__month-label">{{ item.label }}</span>
            <span class="trend-stats__bar-track" aria-hidden="true">
              <span class="trend-stats__bar" :class="`trend-stats__bar--${pnlTone(item.pnl_net)}`" :style="{ width: `${item.width}%` }" />
            </span>
            <span class="trend-stats__month-value" :class="`tone-${pnlTone(item.pnl_net)}`">{{ usdt(item.pnl_net, true) }}</span>
          </li>
        </ul>
      </div>
    </template>
    <p v-else-if="error" class="detail-panel__empty trend-stats__error" role="alert">{{ error }}</p>
    <p v-else class="detail-panel__empty">{{ loaded ? $t('bots.trend_stats_empty') : $t('common.loading') }}</p>
  </section>
</template>

<style scoped>
.trend-stats__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.trend-stats__cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.trend-stats__cell dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.trend-stats__cell dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.trend-stats__big {
  font-size: 1.15rem;
}

.trend-stats__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.trend-stats__error {
  color: var(--color-danger);
}

.trend-stats__months {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-stats__months-title {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.trend-stats__month-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trend-stats__month {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.trend-stats__month-label {
  color: var(--color-text-muted);
}

.trend-stats__bar-track {
  height: 6px;
  border-radius: 999px;
  background: rgb(255 255 255 / 5%);
  overflow: hidden;
}

.trend-stats__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-text-muted);
}

.trend-stats__bar--up {
  background: var(--color-up);
}

.trend-stats__bar--down {
  background: var(--color-down);
}

.trend-stats__month-value {
  font-weight: 600;
  text-align: right;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .trend-stats__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
