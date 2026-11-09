<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import {
  buildDcaLadder,
  dcaPhaseLabel,
  dcaPhaseTone,
  dcaStopLossPercent,
  dcaTrailingPercent,
  readDcaLadderParams,
  type DcaLadderRow,
} from '~/utils/dcaSpot'
import { formatDateTime, formatPercentValue, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'

/** Spot DCA part of the bot page: cycle state, take profit / stop loss levels, the order ladder, profit. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const status = computed(() => props.bot.dca ?? null)
const active = computed(() => props.bot.lifecycle_status === 'ACTIVE')
const cycleOpen = computed(() => active.value && status.value?.phase === 'open')
const coin = computed(() => baseCoinFromSymbol(props.bot.symbol) ?? '')
const trailingPercent = computed(() => dcaTrailingPercent(props.bot.config))
const stopLossPercent = computed(() => dcaStopLossPercent(props.bot.config))

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)}\u00A0USDT`
}

const phaseNote = computed(() => {
  const value = status.value
  if (!value || !active.value) return null
  if (value.phase === 'waiting_restart' && value.restart_at) {
    return t('bots.dca_restart_at', { time: formatDateTime(value.restart_at, locale.value) })
  }
  if (value.phase === 'starting') return t('bots.dca_phase_starting_note')
  return null
})

/** Price change from the average to the mark, for the TP / SL distance line. */
function distanceFromMark(target: number | null | undefined): string | null {
  const mark = props.bot.mark_price
  if (target == null || mark == null || mark <= 0) return null
  return formatPercentValue(((target - mark) / mark) * 100, locale.value, true)
}

const takeProfitLabel = computed(() => {
  if (trailingPercent.value == null) return t('bots.dca_tp_price')
  return status.value?.trailing_active ? t('bots.dca_trailing_high') : t('bots.dca_tp_activation')
})

const takeProfitValue = computed(() => {
  const value = status.value
  if (!value) return null
  return trailingPercent.value != null && value.trailing_active ? value.trailing_high : value.take_profit_price
})

const takeProfitSub = computed(() => {
  if (trailingPercent.value != null) {
    const percent = formatPercentValue(trailingPercent.value, locale.value)
    return status.value?.trailing_active
      ? t('bots.dca_trailing_sell_sub', { percent })
      : t('bots.dca_trailing_sub', { percent })
  }
  const distance = distanceFromMark(status.value?.take_profit_price)
  return distance ? t('bots.dca_from_mark', { value: distance }) : null
})

// --- Ladder: config sizes and deviations, absolute prices from the base fill of the current cycle ---

const ladderParams = computed(() => readDcaLadderParams(props.bot.config))
const ladder = computed<DcaLadderRow[]>(() => (ladderParams.value ? buildDcaLadder(ladderParams.value) : []))
const basePrice = computed(() => (cycleOpen.value ? status.value?.base_price ?? null : null))
const filledSafety = computed(() => (cycleOpen.value ? status.value?.safety_filled ?? 0 : 0))

type RowState = 'filled' | 'next' | 'waiting' | 'waiting_funds' | 'rejected' | 'canceled' | 'planned'

/** Per-order state from the server; empty on older servers (then the count-based fallback below is used). */
const safetyByIndex = computed(() => {
  const orders = cycleOpen.value ? status.value?.safety_orders : undefined
  return new Map((orders ?? []).map(order => [order.index, order]))
})

/** Lowest safety order still resting on the book: the next one to fill when the price drops. */
const nextOpenIndex = computed(() => {
  let next: number | null = null
  for (const [index, order] of safetyByIndex.value) {
    if (order.state === 'open' && (next == null || index < next)) next = index
  }
  return next
})

function rowState(row: DcaLadderRow): RowState {
  if (!cycleOpen.value) return 'planned'
  if (row.index === 0) return basePrice.value != null ? 'filled' : 'waiting'
  if (safetyByIndex.value.size) {
    switch (safetyByIndex.value.get(row.index)?.state) {
      case 'filled': return 'filled'
      case 'rejected': return 'rejected'
      case 'canceled': return 'canceled'
      case 'pending': return 'waiting_funds'
      case 'open': return row.index === nextOpenIndex.value ? 'next' : 'waiting'
      default: return 'waiting'
    }
  }
  // Fallback for servers without `safety_orders`: assumes safety orders fill in order
  if (row.index <= filledSafety.value) return 'filled'
  if (row.index === filledSafety.value + 1) return 'next'
  return 'waiting'
}

function rowStateLabel(state: RowState): string {
  switch (state) {
    case 'filled': return t('bots.dca_row_filled')
    case 'next': return t('bots.dca_row_next')
    case 'waiting': return t('bots.dca_row_waiting')
    case 'waiting_funds': return t('bots.dca_row_waiting_funds')
    case 'rejected': return t('bots.dca_row_rejected')
    case 'canceled': return t('bots.dca_row_canceled')
    default: return t('bots.dca_row_planned')
  }
}

function rowPrice(row: DcaLadderRow): string {
  if (basePrice.value == null) return row.index === 0 ? t('bots.dca_market') : formatPercentValue(-row.deviationPercent, locale.value)
  // The server's price is rounded to the pair's tick; the ratio is the unrounded fallback
  const exact = row.index > 0 ? safetyByIndex.value.get(row.index)?.price : null
  return formatPrice(exact ?? basePrice.value * row.priceRatio, locale.value)
}

function rowTitle(row: DcaLadderRow): string {
  return row.index === 0 ? t('bots.dca_order_base') : t('bots.dca_order_safety', { n: row.index })
}

const maxFunds = computed(() => status.value?.max_funds_usdt ?? ladder.value.at(-1)?.cumulativeUsdt ?? null)
</script>

<template>
  <div class="dca-detail">
    <section class="detail-panel" :aria-labelledby="`dca-state-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`dca-state-${bot.id}`" class="detail-panel__title">{{ $t('bots.dca_state_title') }}</h2>
        <span v-if="status" class="detail-panel__note">
          {{ $t('bots.dca_cycles_completed', { n: status.cycles_completed }) }}
        </span>
      </div>

      <template v-if="status">
        <div class="dca-detail__plaque">
          <span class="dca-detail__phase" :class="`dca-detail__phase--${active ? dcaPhaseTone(status.phase) : 'muted'}`">
            {{ dcaPhaseLabel(t, status.phase) }}
          </span>
          <span v-if="status.cycle_no > 0" class="dca-detail__cycle">{{ $t('bots.dca_cycle_no', { n: status.cycle_no }) }}</span>
          <span v-if="phaseNote" class="dca-detail__cycle">{{ phaseNote }}</span>
        </div>

        <dl class="dca-detail__stats">
          <template v-if="cycleOpen">
            <div class="dca-detail__stat">
              <dt>{{ $t('bots.dca_safety_filled') }}</dt>
              <dd>{{ status.safety_filled }}/{{ status.safety_total }}</dd>
              <span v-if="status.next_safety_price != null" class="dca-detail__sub">
                {{ $t('bots.dca_next_safety', { price: price(status.next_safety_price) }) }}
              </span>
            </div>
            <div class="dca-detail__stat">
              <dt>{{ $t('bots.dca_avg_price') }}</dt>
              <dd>{{ price(status.avg_price) }}</dd>
              <span class="dca-detail__sub">{{ $t('bots.dca_base_price') }}: {{ price(status.base_price) }}</span>
            </div>
            <div class="dca-detail__stat">
              <dt>{{ takeProfitLabel }}</dt>
              <dd class="tone-up">{{ price(takeProfitValue) }}</dd>
              <span v-if="takeProfitSub" class="dca-detail__sub">{{ takeProfitSub }}</span>
            </div>
            <div class="dca-detail__stat">
              <dt>{{ $t('bots.dca_stop_loss_price') }}</dt>
              <dd :class="{ 'tone-down': status.stop_loss_price != null }">
                {{ stopLossPercent == null ? $t('bots.value_off') : price(status.stop_loss_price) }}
              </dd>
              <span v-if="stopLossPercent != null && distanceFromMark(status.stop_loss_price)" class="dca-detail__sub">
                {{ $t('bots.dca_from_mark', { value: distanceFromMark(status.stop_loss_price) }) }}
              </span>
            </div>
            <div class="dca-detail__stat">
              <dt>{{ $t('bots.dca_invested') }}</dt>
              <dd>{{ usdt(status.invested_usdt) }}</dd>
              <span class="dca-detail__sub">{{ $t('bots.dca_of_max', { value: usdt(maxFunds) }) }}</span>
            </div>
            <div class="dca-detail__stat">
              <dt>{{ $t('bots.dca_qty') }}</dt>
              <dd>{{ status.qty == null ? '—' : `${formatQuantity(status.qty, locale)} ${coin}` }}</dd>
            </div>
          </template>
          <div class="dca-detail__stat">
            <dt>{{ $t('bots.dca_realized_profit') }}</dt>
            <dd :class="`tone-${pnlTone(status.realized_profit_usdt)}`">{{ usdt(status.realized_profit_usdt, true) }}</dd>
            <span class="dca-detail__sub">{{ $t('bots.dca_realized_sub') }}</span>
          </div>
          <div class="dca-detail__stat">
            <dt>{{ $t('bots.dca_last_cycle_profit') }}</dt>
            <dd :class="`tone-${pnlTone(status.last_cycle_profit_usdt)}`">{{ usdt(status.last_cycle_profit_usdt, true) }}</dd>
          </div>
          <div v-if="!cycleOpen" class="dca-detail__stat">
            <dt>{{ $t('bots.dca_max_funds') }}</dt>
            <dd>{{ usdt(maxFunds) }}</dd>
          </div>
        </dl>
      </template>
      <p v-else class="detail-panel__empty">{{ $t('bots.dca_state_empty') }}</p>
    </section>

    <section v-if="ladder.length" class="detail-panel" :aria-labelledby="`dca-ladder-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`dca-ladder-${bot.id}`" class="detail-panel__title">{{ $t('bots.dca_ladder_title') }}</h2>
        <span class="detail-panel__note">{{ $t('bots.dca_max_funds') }}: {{ usdt(maxFunds) }}</span>
      </div>

      <div class="detail-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col">{{ $t('bots.dca_col_order') }}</th>
              <th scope="col" class="num">{{ $t('bots.dca_col_deviation') }}</th>
              <th scope="col" class="num">{{ $t('bots.dca_col_price') }}</th>
              <th scope="col" class="num">{{ $t('bots.dca_col_size') }}</th>
              <th scope="col" class="num">{{ $t('bots.dca_col_total') }}</th>
              <th scope="col">{{ $t('bots.dca_col_state') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in ladder" :key="row.index">
              <td>{{ rowTitle(row) }}</td>
              <td class="num" :data-label="$t('bots.dca_col_deviation')">
                {{ row.index === 0 ? '—' : formatPercentValue(-row.deviationPercent, locale) }}
              </td>
              <td class="num" :data-label="$t('bots.dca_col_price')">{{ rowPrice(row) }}</td>
              <td class="num" :data-label="$t('bots.dca_col_size')">{{ usdt(row.sizeUsdt) }}</td>
              <td class="num" :data-label="$t('bots.dca_col_total')">{{ usdt(row.cumulativeUsdt) }}</td>
              <td :data-label="$t('bots.dca_col_state')">
                <span class="dca-detail__row-state" :class="`dca-detail__row-state--${rowState(row)}`">{{ rowStateLabel(rowState(row)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="detail-panel__hint">
        {{ basePrice != null ? $t('bots.dca_ladder_hint_cycle') : $t('bots.dca_ladder_hint_planned') }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.dca-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dca-detail__plaque {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.dca-detail__phase {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.dca-detail__phase--live {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.dca-detail__phase--wait {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.dca-detail__cycle {
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.dca-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.dca-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.dca-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.dca-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.dca-detail__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.dca-detail__row-state {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.dca-detail__row-state--filled {
  color: var(--color-up);
}

.dca-detail__row-state--next {
  color: var(--color-accent);
}

.dca-detail__row-state--rejected,
.dca-detail__row-state--canceled {
  color: var(--color-text-muted);
  opacity: 0.7;
  text-decoration: line-through;
}

.dca-detail__row-state--waiting_funds {
  color: var(--color-text-muted);
  font-style: italic;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .dca-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
