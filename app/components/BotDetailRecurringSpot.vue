<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { pnlTone } from '~/utils/botView'
import { formatDateTime, formatPercentValue, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'
import {
  recurringDipPeriod,
  recurringIntervalHours,
  recurringIntervalLabel,
  recurringPhaseLabel,
  recurringPhaseTone,
} from '~/utils/recurringSpot'

/** Recurring-buy part of the bot page: schedule, accumulated coins, budget, the last buy. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const status = computed(() => props.bot.recurring ?? null)
const active = computed(() => props.bot.lifecycle_status === 'ACTIVE')
const coin = computed(() => baseCoinFromSymbol(props.bot.symbol) ?? '')
const intervalHours = computed(() => recurringIntervalHours(props.bot.config))
const dipPeriod = computed(() => recurringDipPeriod(props.bot.config))

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)}\u00A0USDT`
}

/** What the coins are worth at the mark price, minus what they cost. */
const unrealized = computed(() => {
  const value = status.value
  const mark = props.bot.mark_price
  if (!value || value.qty == null || value.invested_usdt == null || mark == null) return null
  return value.qty * mark - value.invested_usdt
})

const unrealizedPercent = computed(() => {
  const value = status.value
  if (!value || unrealized.value == null || !value.invested_usdt) return null
  return (unrealized.value / value.invested_usdt) * 100
})

const budgetUsedPercent = computed(() => {
  const value = status.value
  if (!value || value.budget_usdt == null || value.budget_usdt <= 0 || value.invested_usdt == null) return null
  return Math.min(100, (value.invested_usdt / value.budget_usdt) * 100)
})
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`rec-state-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`rec-state-${bot.id}`" class="detail-panel__title">{{ $t('bots.recurring_state_title') }}</h2>
      <span class="detail-panel__note">{{ recurringIntervalLabel(t, intervalHours) }}</span>
    </div>

    <template v-if="status">
      <div class="rec-detail__plaque">
        <span class="rec-detail__phase" :class="`rec-detail__phase--${active ? recurringPhaseTone(status.phase) : 'muted'}`">
          {{ recurringPhaseLabel(t, status.phase) }}
        </span>
        <span v-if="active && status.next_buy_at" class="rec-detail__note">
          {{ $t('bots.recurring_next_buy_at', { time: formatDateTime(status.next_buy_at, locale), value: usdt(status.next_buy_usdt) }) }}
        </span>
      </div>
      <UAlert
        v-if="status.last_skip_reason"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="status.last_skip_reason"
      />

      <dl class="rec-detail__stats">
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.recurring_qty') }}</dt>
          <dd>{{ status.qty == null ? '—' : `${formatQuantity(status.qty, locale)} ${coin}` }}</dd>
          <span class="rec-detail__sub">{{ $t('bots.recurring_buys_n', { n: status.buys_done }) }}</span>
        </div>
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.dca_avg_price') }}</dt>
          <dd>{{ price(status.avg_price) }}</dd>
        </div>
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.dca_invested') }}</dt>
          <dd>{{ usdt(status.invested_usdt) }}</dd>
          <span v-if="status.fees_usdt" class="rec-detail__sub">{{ $t('bots.recurring_fees', { value: usdt(status.fees_usdt) }) }}</span>
        </div>
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.recurring_unrealized') }}</dt>
          <dd :class="`tone-${pnlTone(unrealized)}`">{{ usdt(unrealized, true) }}</dd>
          <span v-if="unrealizedPercent != null" class="rec-detail__sub">{{ formatPercentValue(unrealizedPercent, locale, true) }}</span>
        </div>
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.recurring_budget') }}</dt>
          <dd>{{ status.budget_usdt == null ? $t('bots.recurring_no_limit') : usdt(status.budget_left_usdt) }}</dd>
          <span v-if="budgetUsedPercent != null" class="rec-detail__sub">
            {{ $t('bots.recurring_budget_used', { percent: formatPercentValue(budgetUsedPercent, locale), total: usdt(status.budget_usdt) }) }}
          </span>
        </div>
        <div class="rec-detail__stat">
          <dt>{{ $t('bots.recurring_last_buy') }}</dt>
          <dd>{{ status.last_buy_price == null ? '—' : price(status.last_buy_price) }}</dd>
          <span v-if="status.last_buy_at" class="rec-detail__sub">
            {{ formatDateTime(status.last_buy_at, locale) }} · {{ usdt(status.last_buy_usdt) }}<template v-if="status.last_buy_dip"> · {{ $t('bots.recurring_dip_buy') }}</template>
          </span>
        </div>
        <div v-if="dipPeriod != null" class="rec-detail__stat">
          <dt>{{ $t('bots.recurring_ma', { n: dipPeriod }) }}</dt>
          <dd>{{ price(status.ma_price) }}</dd>
          <span class="rec-detail__sub" :class="{ 'tone-up': status.dip_active }">
            {{ status.dip_active ? $t('bots.recurring_dip_active') : $t('bots.recurring_dip_inactive') }}
          </span>
        </div>
      </dl>
    </template>
    <p v-else class="detail-panel__empty">{{ $t('bots.recurring_state_empty') }}</p>
  </section>
</template>

<style scoped>
.rec-detail__plaque {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.rec-detail__phase {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.rec-detail__phase--live {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.rec-detail__phase--wait {
  border-color: rgb(196 181 253 / 45%);
  color: var(--color-accent);
}

.rec-detail__note {
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.rec-detail__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.rec-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.rec-detail__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.rec-detail__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.rec-detail__sub {
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
  .rec-detail__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
