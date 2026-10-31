<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import { formatCount, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { gridSpotExitReasonLabel, gridSpotPhaseLabel, gridSpotPhaseTone } from '~/utils/gridSpot'
import { baseCoinFromSymbol } from '~/utils/orderSize'

/** Spot grid part of the bot page: phase, round trips, profit, the grid's coins and every cell. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const status = computed(() => props.bot.grid_spot ?? null)
const active = computed(() => props.bot.lifecycle_status === 'ACTIVE')
const coin = computed(() => baseCoinFromSymbol(props.bot.symbol) ?? '')

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)}\u00A0USDT`
}

/** The grid's coins at the mark price, minus what they cost. */
const unrealized = computed(() => {
  const value = status.value
  const mark = props.bot.mark_price ?? value?.last_price ?? null
  if (!value || !value.qty || value.cost_usdt == null || mark == null) return null
  return value.qty * mark - value.cost_usdt
})

const range = computed(() => {
  const config = props.bot.config as Record<string, unknown> | null
  const lower = Number(config?.lower_price)
  const upper = Number(config?.upper_price)
  return Number.isFinite(lower) && Number.isFinite(upper) ? `${price(lower)} – ${price(upper)}` : '—'
})

/** Top cell first, like an order book. */
const cells = computed(() => [...(status.value?.cells ?? [])].reverse())

function cellStateLabel(state: string) {
  if (state === 'open') return t('bots.grid_spot_cell_open')
  if (state === 'rejected') return t('bots.grid_spot_cell_rejected')
  return t('bots.grid_spot_cell_waiting')
}
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`gs-state-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`gs-state-${bot.id}`" class="detail-panel__title">{{ $t('bots.grid_spot_state_title') }}</h2>
      <span class="detail-panel__note">{{ range }}</span>
    </div>

    <template v-if="status">
      <div class="gs-detail__plaque">
        <span class="gs-detail__phase" :class="`gs-detail__phase--${active ? gridSpotPhaseTone(status.phase) : 'muted'}`">
          {{ gridSpotPhaseLabel(t, status.phase) }}
        </span>
        <span v-if="status.phase === 'stopped' && status.exit_reason" class="gs-detail__note">
          {{ gridSpotExitReasonLabel(t, status.exit_reason) }}
        </span>
        <span v-else-if="status.in_range === false && active" class="gs-detail__note">
          {{ $t('bots.grid_spot_out_of_range') }}
        </span>
      </div>
      <UAlert
        v-if="status.entry_rejected_reason"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="status.entry_rejected_reason"
      />

      <dl class="gs-detail__stats">
        <div class="gs-detail__stat">
          <dt>{{ $t('bots.grid_spot_realized') }}</dt>
          <dd :class="`tone-${pnlTone(status.realized_profit_usdt)}`">{{ usdt(status.realized_profit_usdt, true) }}</dd>
          <span class="gs-detail__sub">{{ $t('bots.grid_spot_round_trips_n', { n: formatCount(status.round_trips, locale) }) }}</span>
        </div>
        <div class="gs-detail__stat">
          <dt>{{ $t('bots.grid_spot_held') }}</dt>
          <dd>{{ status.qty == null ? '—' : `${formatQuantity(status.qty, locale)} ${coin}` }}</dd>
          <span v-if="status.avg_price != null" class="gs-detail__sub">{{ $t('bots.grid_spot_avg', { price: price(status.avg_price) }) }}</span>
        </div>
        <div class="gs-detail__stat">
          <dt>{{ $t('bots.recurring_unrealized') }}</dt>
          <dd :class="`tone-${pnlTone(unrealized)}`">{{ usdt(unrealized, true) }}</dd>
          <span v-if="status.fees_usdt" class="gs-detail__sub">{{ $t('bots.recurring_fees', { value: usdt(status.fees_usdt) }) }}</span>
        </div>
        <div class="gs-detail__stat">
          <dt>{{ $t('bots.grid_spot_orders') }}</dt>
          <dd>{{ $t('bots.grid_spot_preview_cells', { buy: status.buy_orders, sell: status.sell_orders }) }}</dd>
          <span v-if="status.stop_loss_price != null || status.take_profit_price != null" class="gs-detail__sub">
            <template v-if="status.stop_loss_price != null">SL {{ price(status.stop_loss_price) }}</template>
            <template v-if="status.stop_loss_price != null && status.take_profit_price != null"> · </template>
            <template v-if="status.take_profit_price != null">TP {{ price(status.take_profit_price) }}</template>
          </span>
        </div>
      </dl>

      <ol v-if="cells.length" class="gs-detail__cells" :aria-label="$t('bots.grid_spot_cells')">
        <li
          v-for="cell in cells"
          :key="cell.index"
          class="gs-detail__cell"
          :class="[`gs-detail__cell--${cell.side}`, `gs-detail__cell--${cell.state}`]"
        >
          <span class="gs-detail__cell-head">
            <span>№{{ cell.index }}</span>
            <span>{{ cellStateLabel(cell.state) }}</span>
          </span>
          <span>
            {{ cell.side === 'sell' ? $t('bots.grid_spot_side_sell') : $t('bots.grid_spot_side_buy') }}
            {{ price(cell.side === 'sell' ? cell.sell_price : cell.buy_price) }}
          </span>
          <span v-if="cell.side === 'sell' && cell.qty != null" class="gs-detail__sub">{{ formatQuantity(cell.qty, locale) }} {{ coin }}</span>
        </li>
      </ol>
    </template>
    <p v-else class="detail-panel__empty">{{ $t('bots.grid_spot_state_empty') }}</p>
  </section>
</template>

<style scoped>
.gs-detail__plaque {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.gs-detail__phase {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.gs-detail__phase--live {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.gs-detail__phase--wait {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.gs-detail__note {
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.gs-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.gs-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.gs-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.gs-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.gs-detail__sub {
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

.gs-detail__cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.gs-detail__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-left: 3px solid var(--color-up);
  border-radius: 8px;
  background: rgb(255 255 255 / 3%);
}

.gs-detail__cell--sell {
  border-left-color: var(--color-down);
}

.gs-detail__cell--waiting,
.gs-detail__cell--rejected {
  opacity: 0.6;
}

.gs-detail__cell-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  color: var(--color-text-muted);
}

@media (max-width: 900px) {
  .gs-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
