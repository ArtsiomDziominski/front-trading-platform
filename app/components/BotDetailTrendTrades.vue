<script setup lang="ts">
import type { TrendTrade } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import { formatDateTime, formatPercentValue, formatPrice, formatUsdt } from '~/utils/formatNumber'
import { formatR, trendExitReasonLabel } from '~/utils/trend'

/** Positions of a trend bot (GET /bots/{id}/trades), newest first; an open one has no exit yet. */
defineProps<{
  botId: number
  trades: TrendTrade[]
  loaded: boolean
  error: string | null
}>()

const { t, locale } = useI18n()

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function usdt(value: number | null | undefined) {
  return value == null ? '—' : formatUsdt(value, locale.value, true)
}

function moves(trade: TrendTrade) {
  if (trade.mfe == null && trade.mae == null) return undefined
  return t('bots.trend_trade_moves', {
    mfe: trade.mfe == null ? '—' : formatPercentValue(trade.mfe, locale.value, true),
    mae: trade.mae == null ? '—' : formatPercentValue(trade.mae, locale.value, true),
  })
}
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`trend-trades-${botId}`">
    <div class="detail-panel__head">
      <h2 :id="`trend-trades-${botId}`" class="detail-panel__title">{{ $t('bots.trend_trades_title') }}</h2>
      <span v-if="error && trades.length" class="detail-panel__note trend-trades__error">{{ error }}</span>
    </div>

    <div v-if="trades.length" class="detail-table-wrap">
      <table class="detail-table">
        <thead>
          <tr>
            <th scope="col">{{ $t('bots.trend_col_side') }}</th>
            <th scope="col">{{ $t('bots.trend_col_opened') }}</th>
            <th scope="col">{{ $t('bots.trend_col_closed') }}</th>
            <th scope="col" class="num">{{ $t('bots.trend_col_entry') }}</th>
            <th scope="col" class="num">{{ $t('bots.trend_col_exit') }}</th>
            <th scope="col" class="num">{{ $t('bots.trend_col_units') }}</th>
            <th scope="col" class="num">{{ $t('bots.trend_col_pnl') }}</th>
            <th scope="col" class="num">R</th>
            <th scope="col">{{ $t('bots.trend_col_exit_reason') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in trades" :key="trade.id" :title="moves(trade)">
            <td :data-label="$t('bots.trend_col_side')">
              <span :class="{ 'tone-up': trade.side === 'LONG', 'tone-down': trade.side === 'SHORT' }" class="trend-trades__side">{{ trade.side }}</span>
            </td>
            <td :data-label="$t('bots.trend_col_opened')">{{ formatDateTime(trade.opened_at, locale) }}</td>
            <td :data-label="$t('bots.trend_col_closed')">
              <template v-if="trade.closed_at">{{ formatDateTime(trade.closed_at, locale) }}</template>
              <span v-else class="trend-trades__open">{{ $t('bots.trend_trade_open') }}</span>
            </td>
            <td class="num" :data-label="$t('bots.trend_col_entry')">{{ price(trade.entry_avg) }}</td>
            <td class="num" :data-label="$t('bots.trend_col_exit')">{{ price(trade.exit_avg) }}</td>
            <td class="num" :data-label="$t('bots.trend_col_units')">{{ trade.units }}</td>
            <td class="num" :class="`tone-${pnlTone(trade.pnl_net)}`" :data-label="$t('bots.trend_col_pnl')">{{ usdt(trade.pnl_net) }}</td>
            <td class="num" :class="`tone-${pnlTone(trade.r_multiple)}`" data-label="R">{{ formatR(trade.r_multiple, locale) }}</td>
            <td :data-label="$t('bots.trend_col_exit_reason')">{{ trade.exit_reason ? trendExitReasonLabel(t, trade.exit_reason) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="error" class="detail-panel__empty trend-trades__error" role="alert">{{ error }}</p>
    <p v-else class="detail-panel__empty">{{ loaded ? $t('bots.trend_trades_empty') : $t('common.loading') }}</p>
    <p v-if="trades.length" class="detail-panel__hint">{{ $t('bots.trend_trades_hint') }}</p>
  </section>
</template>

<style scoped>
.trend-trades__side {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.trend-trades__open {
  color: var(--color-accent);
}

.trend-trades__error {
  color: var(--color-danger);
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}
</style>
