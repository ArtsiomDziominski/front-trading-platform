<script setup lang="ts">
import { TakeProfitMode, type BotListItem } from '#shared/types/bot'
import { botDirection, effectiveGridConfig, isInPosition, isSpotBot, pnlTone } from '~/utils/botView'
import { formatPercentValue, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'
import { parseTakeProfit } from '~/utils/takeProfit'

/** Open position of the bot as the exchange reports it, plus values derived from it. */
const props = defineProps<{
  bot: BotListItem
}>()

const { t, locale } = useI18n()

const inPosition = computed(() => isInPosition(props.bot))
const side = computed(() => props.bot.position_side ?? botDirection(props.bot))
const isSpot = computed(() => isSpotBot(props.bot))
// OKX futures report the size in contracts, Binance in coins; spot bots always hold coins
const sizeInCoins = computed(() => isSpot.value || props.bot.exchange !== 'OKX')
const sizeUnit = computed(() => (sizeInCoins.value ? baseCoinFromSymbol(props.bot.symbol) ?? '' : t('bots.position_contracts')))
const size = computed(() => Math.abs(props.bot.position_size ?? 0))

const priceChangePercent = computed(() => {
  const { entry_price: entry, mark_price: mark } = props.bot
  if (entry == null || mark == null || entry <= 0) return null
  return ((mark - entry) / entry) * 100
})

const notionalUsdt = computed(() => {
  const mark = props.bot.mark_price
  if (!sizeInCoins.value || mark == null) return null
  return size.value * mark
})

const frozen = computed(() => props.bot.lifecycle_status !== 'ACTIVE')

/**
 * Grid take-profit price, same formula as the engine (app/strategies/grid.py take_profit_price),
 * from the config the engine trades on. Stopping a bot cancels its orders, so there is no target then.
 */
const takeProfitPrice = computed(() => {
  // Spot DCA: the engine reports the price of its resting (or trailing activation) take profit
  if (props.bot.bot_type === 'DCA_SPOT') return frozen.value ? null : props.bot.dca?.take_profit_price ?? null
  // A recurring-buy bot never sells: no target
  if (props.bot.bot_type === 'RECURRING_SPOT') return null
  if (props.bot.bot_type !== 'GRID_FUTURES' || frozen.value) return null
  const entry = props.bot.entry_price
  if (entry == null || entry <= 0 || !size.value) return null
  const long = side.value === 'LONG'
  const { mode, percent, amount } = parseTakeProfit(effectiveGridConfig(props.bot))
  if (mode === TakeProfitMode.Percent && percent != null) {
    return entry * (1 + (long ? percent : -percent) / 100)
  }
  if (mode === TakeProfitMode.Amount && amount != null && sizeInCoins.value) {
    return entry + (long ? amount : -amount) / size.value
  }
  return null
})

const emptyText = computed(() => {
  if (props.bot.lifecycle_status === 'CLOSED') return t('bots.position_none_closed')
  if (props.bot.lifecycle_status === 'STOPPED') return t('bots.position_none_stopped')
  if (props.bot.bot_type === 'ANTI_MARTINGALE_FUTURES') return t('bots.position_none_waiting')
  if (props.bot.bot_type === 'TREND_FUTURES') return t('bots.trend_position_none')
  if (props.bot.bot_type === 'DCA_SPOT') return t('bots.dca_position_none')
  if (props.bot.bot_type === 'RECURRING_SPOT') return t('bots.recurring_position_none')
  return t('bots.position_none')
})

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

// Exchange ROE on margin, not the price change
const roe = computed(() => props.bot.pnl_percent)
</script>

<template>
  <section class="detail-panel position-panel" :aria-labelledby="`position-title-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`position-title-${bot.id}`" class="detail-panel__title">{{ $t('bots.position_title') }}</h2>
      <span v-if="inPosition && frozen" class="detail-panel__note">{{ $t('bots.position_frozen') }}</span>
    </div>

    <dl v-if="inPosition" class="position-panel__grid">
      <div class="position-panel__stat">
        <dt>{{ $t('bots.pnl_usdt') }}</dt>
        <dd class="position-panel__big" :class="`tone-${pnlTone(bot.unrealized_pnl)}`">
          {{ bot.unrealized_pnl == null ? '—' : formatUsdt(bot.unrealized_pnl, locale, true) }}
        </dd>
      </div>
      <div v-if="!isSpot" class="position-panel__stat">
        <dt :title="$t('bots.position_roe_hint')">{{ $t('bots.position_roe') }}</dt>
        <dd class="position-panel__big" :class="`tone-${pnlTone(roe)}`">
          {{ roe == null ? '—' : formatPercentValue(roe, locale, true) }}
        </dd>
      </div>
      <div class="position-panel__stat">
        <dt>{{ $t('bots.position_size') }}</dt>
        <dd>
          <span class="position-panel__side" :class="`position-panel__side--${side.toLowerCase()}`">{{ side }}</span>
          {{ formatQuantity(size, locale) }} {{ sizeUnit }}
        </dd>
      </div>
      <div class="position-panel__stat">
        <dt>{{ $t('bots.position_entry') }}</dt>
        <dd>{{ price(bot.entry_price) }}</dd>
      </div>
      <div class="position-panel__stat">
        <dt>{{ $t('bots.position_mark') }}</dt>
        <dd>{{ price(bot.mark_price) }}</dd>
      </div>
      <div class="position-panel__stat">
        <dt>{{ $t('bots.position_change') }}</dt>
        <dd>{{ priceChangePercent == null ? '—' : formatPercentValue(priceChangePercent, locale, true) }}</dd>
      </div>
      <div v-if="notionalUsdt != null" class="position-panel__stat">
        <dt>{{ $t('bots.position_notional') }}</dt>
        <dd>{{ formatUsdt(notionalUsdt, locale) }} USDT</dd>
      </div>
      <div v-if="takeProfitPrice != null" class="position-panel__stat">
        <dt :title="$t('bots.position_take_profit_hint')">{{ $t('bots.position_take_profit') }}</dt>
        <dd>≈ {{ price(takeProfitPrice) }}</dd>
      </div>
    </dl>

    <p v-else class="detail-panel__empty">{{ emptyText }}</p>
  </section>
</template>

<style scoped>
.position-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.position-panel__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.position-panel__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.position-panel__stat dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.position-panel__big {
  font-size: 1.2rem;
  font-weight: 700 !important;
}

.position-panel__side {
  margin-right: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.position-panel__side--long {
  color: var(--color-up);
}

.position-panel__side--short {
  color: var(--color-down);
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 900px) {
  .position-panel__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .position-panel__stat {
    padding: 12px;
  }

  .position-panel__side {
    display: block;
    margin: 0 0 2px;
  }
}
</style>
