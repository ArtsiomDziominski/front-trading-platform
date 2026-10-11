<script setup lang="ts">
import type { BotEventOut, BotListItem, GridCycleSettlement, GridCycleState } from '#shared/types/bot'
import { formatDateTime, formatPrice, formatQuantity, formatUsdt, toNumber } from '~/utils/formatNumber'
import { isMixedCycleInProgress } from '~/utils/mixedGrid'
import { pnlTone } from '~/utils/botView'

/** Mixed grid cycles: the frozen orders of the running cycle and the settlement of finished ones. */
const props = defineProps<{
  bot: BotListItem
  events: BotEventOut[]
}>()

const { t, locale } = useI18n()

const state = computed(() => (props.bot.cycle_state ?? null) as GridCycleState | null)
const cycle = computed(() => state.value?.cycle ?? null)
// Stopping or closing cancels the orders without settling the cycle, so only an active bot has a running cycle
const inProgress = computed(() => props.bot.lifecycle_status === 'ACTIVE' && isMixedCycleInProgress(props.bot))

/** Numbers come as strings in configs; compare values, not their spelling. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item != null && item !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return toNumber(value) ?? value
}

const hasPendingChanges = computed(() => {
  if (!inProgress.value || !cycle.value) return false
  return JSON.stringify(canonical(cycle.value.config)) !== JSON.stringify(canonical(props.bot.config))
})

const filledOrderIds = computed(() => new Set(
  props.events
    .filter((event) => event.event_type === 'order_filled' && typeof event.payload?.client_order_id === 'string')
    .map((event) => event.payload?.client_order_id as string),
))

function usdt(value: unknown, signed = false) {
  const number = toNumber(value)
  return number == null ? '—' : formatUsdt(number, locale.value, signed)
}

function usdtWithUnit(value: unknown) {
  const text = usdt(value)
  return text === '—' ? text : `${text} USDT`
}

/**
 * Deposit the next cycle sizes % orders from: the compounded one, unless the deposit setting was changed
 * since (same rule as the engine's `next_cycle_deposit` and BotMixedGridFields).
 */
const nextDeposit = computed(() => {
  const current = state.value
  const configured = toNumber((props.bot.config.mixed_grid as Record<string, unknown> | null | undefined)?.deposit_usdt)
  const compounded = toNumber(current?.deposit_usdt)
  const source = toNumber(current?.deposit_source_usdt)
  if (compounded != null && source != null && configured != null && source === configured) return compounded
  return configured ?? compounded
})

function price(value: unknown) {
  const number = toNumber(value)
  return number == null ? '—' : formatPrice(number, locale.value)
}

function quantity(value: unknown) {
  const number = toNumber(value)
  return number == null ? '—' : formatQuantity(number, locale.value)
}

function orderSize(size: string, unit: string) {
  return unit === 'PERCENT' ? `${size}%` : `${size} USDT`
}

const history = computed(() => [...(state.value?.history ?? [])].reverse())

const SOURCE_KEYS: Record<GridCycleSettlement['source'], string> = {
  exchange_income: 'bots.grid_source_exchange',
  orders_estimate: 'bots.grid_source_estimate',
  unavailable: 'bots.grid_source_unavailable',
}

const totalNet = computed(() => {
  const values = history.value.map((row) => toNumber(row.net_result_usdt)).filter((value): value is number => value != null)
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
})

function sourceLabel(source: GridCycleSettlement['source']) {
  const key = SOURCE_KEYS[source]
  return key ? t(key) : source
}
</script>

<template>
  <div v-if="state" class="grid-detail">
    <section class="detail-panel" :aria-labelledby="`grid-cycle-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`grid-cycle-${bot.id}`" class="detail-panel__title">
          {{ inProgress ? $t('bots.grid_cycle_current') : $t('bots.grid_cycle_last') }}
        </h2>
        <span v-if="cycle" class="detail-panel__note">
          {{ $t('bots.grid_cycle_started', { date: formatDateTime(cycle.started_at, locale) }) }}
        </span>
      </div>

      <dl class="detail-list grid-detail__list">
        <div v-if="cycle" class="detail-list__row">
          <dt>{{ $t('bots.mixed_base_deposit') }}</dt>
          <dd>{{ usdtWithUnit(cycle.base_deposit_usdt) }}</dd>
        </div>
        <div v-if="cycle" class="detail-list__row">
          <dt>{{ $t('bots.mixed_total_notional') }}</dt>
          <dd>{{ usdtWithUnit(cycle.total_notional_usdt) }}</dd>
        </div>
        <div v-if="cycle" class="detail-list__row">
          <dt :title="$t('bots.grid_anchor_hint')">{{ $t('bots.grid_anchor') }}</dt>
          <dd>{{ price(cycle.anchor_price) }}</dd>
        </div>
        <div v-if="cycle?.closed_at" class="detail-list__row">
          <dt>{{ $t('bots.grid_cycle_closed') }}</dt>
          <dd>{{ formatDateTime(cycle.closed_at, locale) }}</dd>
        </div>
        <!-- While a cycle runs its result is not known yet, so the next deposit is shown only between cycles -->
        <div v-if="!inProgress && nextDeposit != null" class="detail-list__row">
          <dt :title="$t('bots.mixed_deposit_hint')">{{ $t('bots.grid_next_deposit') }}</dt>
          <dd>{{ usdtWithUnit(nextDeposit) }}</dd>
        </div>
      </dl>

      <p v-if="hasPendingChanges" class="grid-detail__pending" role="note">
        {{ $t('bots.mixed_edit_next_cycle') }}
      </p>

      <div v-if="cycle?.orders.length" class="detail-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col">{{ $t('bots.col_number') }}</th>
              <th scope="col">{{ $t('bots.grid_col_kind') }}</th>
              <th scope="col" class="num">{{ $t('bots.mixed_col_size') }}</th>
              <th scope="col" class="num">{{ $t('bots.mixed_col_step') }}</th>
              <th scope="col" class="num">{{ $t('bots.mixed_col_price') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_quantity') }}</th>
              <th scope="col" class="num">{{ $t('bots.mixed_col_notional') }}</th>
              <th scope="col">{{ $t('bots.am_col_status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in cycle.orders" :key="order.client_order_id">
              <td>{{ order.number }}</td>
              <td>{{ order.kind === 'entry' ? $t('bots.mixed_kind_entry') : $t('bots.mixed_kind_grid') }}</td>
              <td class="num">{{ orderSize(order.size, order.unit) }}</td>
              <td class="num">{{ order.step_percent == null ? '—' : `${order.step_percent}%` }}</td>
              <td class="num">{{ order.kind === 'entry' ? `≈ ${price(order.price)}` : price(order.price) }}</td>
              <td class="num">{{ quantity(order.quantity) }}</td>
              <td class="num">{{ usdt(order.notional_usdt) }}</td>
              <td>
                <span
                  class="grid-detail__order-status"
                  :class="{ 'grid-detail__order-status--filled': filledOrderIds.has(order.client_order_id) }"
                >
                  {{ filledOrderIds.has(order.client_order_id) ? $t('bots.am_leg_filled') : inProgress ? $t('bots.grid_order_open') : '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="cycle?.orders.length" class="detail-panel__hint">{{ $t('bots.grid_orders_hint') }}</p>
    </section>

    <section class="detail-panel" :aria-labelledby="`grid-history-${bot.id}`">
      <div class="detail-panel__head">
        <h2 :id="`grid-history-${bot.id}`" class="detail-panel__title">{{ $t('bots.grid_history_title') }}</h2>
        <span v-if="totalNet != null" class="detail-panel__note">
          {{ $t('bots.grid_history_total') }}
          <strong :class="`tone-${pnlTone(totalNet)}`">{{ formatUsdt(totalNet, locale, true) }} USDT</strong>
        </span>
      </div>

      <div v-if="history.length" class="detail-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col">{{ $t('bots.grid_cycle_closed') }}</th>
              <th scope="col" class="num">{{ $t('bots.mixed_base_deposit') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_realized') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_fees') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_funding') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_net') }}</th>
              <th scope="col" class="num">{{ $t('bots.grid_col_deposit_after') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in history" :key="`${row.config_version}-${row.closed_at}`">
              <td>
                {{ formatDateTime(row.closed_at, locale) }}
                <span v-if="row.source !== 'exchange_income'" class="grid-detail__source" :title="sourceLabel(row.source)">*</span>
              </td>
              <td class="num">{{ usdt(row.base_deposit_usdt) }}</td>
              <td class="num">{{ usdt(row.realized_pnl_usdt, true) }}</td>
              <td class="num">{{ usdt(row.fees_usdt) }}</td>
              <td class="num">{{ usdt(row.funding_usdt, true) }}</td>
              <td class="num" :class="`tone-${pnlTone(toNumber(row.net_result_usdt))}`">{{ usdt(row.net_result_usdt, true) }}</td>
              <td class="num">{{ usdt(row.deposit_after_usdt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="detail-panel__empty">{{ $t('bots.grid_history_empty') }}</p>
      <p v-if="history.some((row) => row.source !== 'exchange_income')" class="detail-panel__hint">
        * {{ $t('bots.grid_source_note') }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.grid-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-detail__list {
  max-width: 520px;
}

.grid-detail__pending {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgb(245 166 35 / 35%);
  border-radius: 10px;
  background: rgb(245 166 35 / 8%);
  color: var(--color-warning);
  font-size: 0.85rem;
  line-height: 1.45;
}

.grid-detail__order-status {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.grid-detail__order-status--filled {
  color: var(--color-up);
}

.grid-detail__source {
  color: var(--color-warning);
  cursor: help;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}
</style>
