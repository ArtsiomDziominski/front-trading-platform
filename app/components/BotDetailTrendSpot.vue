<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import { formatCount, formatDateTime, formatPercentValue, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'
import { formatR, trendExitReasonLabel, trendSideLabel, trendStateLabel, trendStateTone } from '~/utils/trend'
import { trendSpotDecisionText } from '~/utils/trendSpot'

/** Spot trend part of the bot page: state and why, the position with its stop and next add-on, results. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const status = computed(() => props.bot.trend_spot ?? null)
const active = computed(() => props.bot.lifecycle_status === 'ACTIVE')
const coin = computed(() => baseCoinFromSymbol(props.bot.symbol) ?? '')
const inPosition = computed(() => (status.value?.units ?? 0) > 0)

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)}\u00A0USDT`
}

const tone = computed(() => {
  if (!active.value) return 'muted'
  const value = trendStateTone(status.value?.state)
  if (value === 'long') return 'live'
  return value === 'short' ? 'muted' : value
})

const winRate = computed(() => {
  const value = status.value
  if (!value || !value.trades) return null
  return (value.wins / value.trades) * 100
})
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`tsp-state-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`tsp-state-${bot.id}`" class="detail-panel__title">{{ $t('bots.trend_spot_state_title') }}</h2>
      <span v-if="status?.regime" class="detail-panel__note">{{ $t('bots.trend_spot_regime', { side: trendSideLabel(t, status.regime) }) }}</span>
    </div>

    <template v-if="status">
      <div class="tsp-detail__plaque">
        <span class="tsp-detail__phase" :class="`tsp-detail__phase--${tone}`">
          {{ status.phase === 'stopped' ? $t('bots.grid_spot_phase_stopped') : trendStateLabel(t, status.state) }}
        </span>
        <span v-if="status.decision_reason || status.decision_code" class="tsp-detail__note">
          {{ trendSpotDecisionText(t, status.decision_code, status.decision_reason) }}
        </span>
      </div>
      <UAlert
        v-if="status.add_blocked_reason && inPosition"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="$t('bots.trend_spot_add_blocked', { reason: status.add_blocked_reason })"
      />

      <dl v-if="inPosition" class="tsp-detail__stats">
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_units') }}</dt>
          <dd>{{ status.units }} / {{ status.max_units }}</dd>
          <span class="tsp-detail__sub">{{ status.qty == null ? '—' : `${formatQuantity(status.qty, locale)} ${coin}` }}</span>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.dca_avg_price') }}</dt>
          <dd>{{ price(status.avg_price) }}</dd>
          <span class="tsp-detail__sub">{{ $t('bots.trend_spot_first_entry', { price: price(status.entry_price) }) }}</span>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_stop') }}</dt>
          <dd class="tone-down">{{ price(status.stop_price) }}</dd>
          <span v-if="status.distance_to_stop_pct != null" class="tsp-detail__sub">{{ formatPercentValue(status.distance_to_stop_pct, locale) }}</span>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_next_add') }}</dt>
          <dd>{{ status.next_add_price == null ? $t('bots.trend_spot_pyramid_full') : price(status.next_add_price) }}</dd>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_current_r') }}</dt>
          <dd :class="`tone-${pnlTone(status.current_r)}`">{{ formatR(status.current_r, locale) }}</dd>
          <span class="tsp-detail__sub">1R = {{ usdt(status.risk_usdt) }}</span>
        </div>
      </dl>
      <dl v-else class="tsp-detail__stats">
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_breakout_level') }}</dt>
          <dd>{{ price(status.entry_level) }}</dd>
          <span v-if="status.close != null" class="tsp-detail__sub">{{ $t('bots.trend_spot_last_close', { price: price(status.close) }) }}</span>
        </div>
        <div class="tsp-detail__stat">
          <dt>ADX</dt>
          <dd>{{ status.adx == null ? '—' : formatPrice(status.adx, locale, 1) }}</dd>
        </div>
        <div class="tsp-detail__stat">
          <dt>ATR</dt>
          <dd>{{ price(status.atr) }}</dd>
        </div>
        <div v-if="status.cooldown_until" class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_cooldown_until') }}</dt>
          <dd>{{ formatDateTime(status.cooldown_until, locale) }}</dd>
        </div>
      </dl>

      <dl class="tsp-detail__stats">
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_realized') }}</dt>
          <dd :class="`tone-${pnlTone(status.realized_pnl_usdt)}`">{{ usdt(status.realized_pnl_usdt, true) }}</dd>
          <span v-if="status.fees_usdt" class="tsp-detail__sub">{{ $t('bots.recurring_fees', { value: usdt(status.fees_usdt) }) }}</span>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_capital') }}</dt>
          <dd>{{ usdt(status.capital_usdt) }}</dd>
        </div>
        <div class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_trades') }}</dt>
          <dd>{{ formatCount(status.trades, locale) }}</dd>
          <span v-if="winRate != null" class="tsp-detail__sub">{{ $t('bots.trend_spot_win_rate', { value: formatPercentValue(winRate, locale) }) }}</span>
        </div>
        <div v-if="status.last_trade" class="tsp-detail__stat">
          <dt>{{ $t('bots.trend_spot_last_trade', { n: status.last_trade.trade_no ?? '—' }) }}</dt>
          <dd :class="`tone-${pnlTone(status.last_trade.pnl_usdt)}`">{{ usdt(status.last_trade.pnl_usdt, true) }}</dd>
          <span class="tsp-detail__sub">{{ formatR(status.last_trade.r, locale) }} · {{ trendExitReasonLabel(t, status.last_trade.reason) }}</span>
        </div>
      </dl>
    </template>
    <p v-else class="detail-panel__empty">{{ $t('bots.trend_spot_state_empty') }}</p>
  </section>
</template>

<style scoped>
.tsp-detail__plaque {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.tsp-detail__phase {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.tsp-detail__phase--live {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.tsp-detail__phase--pause {
  border-color: rgb(251 191 36 / 45%);
  color: rgb(251 191 36);
}

.tsp-detail__phase--wait {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.tsp-detail__note {
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.tsp-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.tsp-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.tsp-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.tsp-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.tsp-detail__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .tsp-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
