<script setup lang="ts">
import type { BacktestCreate, BacktestFormSource, BacktestPeriod, BacktestTimeframe, BacktestTrade } from '#shared/types/backtest'
import type { BotListItem } from '#shared/types/bot'
import { BILATERAL_SIGNAL_TIMEFRAMES, bilateralTrailOn, readBilateralConfig } from '~/utils/bilateral'
import { pnlTone } from '~/utils/botView'
import { formatCount, formatDateTime, formatPercentValue, formatPrice, formatUsdt } from '~/utils/formatNumber'
import { formatR, trendExitReasonLabel } from '~/utils/trend'

/**
 * Backtest panel of a BILATERAL_FUTURES bot (POST /backtests): the bot's current settings on history for a chosen
 * timeframe and period, or, on the create page, the form's settings (`source`). There the timeframe switcher is the
 * form's own field (`v-model:timeframe`): picking one here changes it in the form above too.
 * The server keeps the result, so the same choice comes back at once later; a change of the choice or of the
 * settings only looks up a saved result, a computation starts on "Run".
 */
const props = defineProps<{
  /** The user's bot: pair, exchange (from its API key) and saved config. */
  bot?: BotListItem
  /** Instead of `bot`: the create form's settings; null while the form holds an invalid value. */
  source?: BacktestFormSource | null
}>()
/** Create page: the form's signal timeframe, two-way. */
const formTimeframe = defineModel<BacktestTimeframe>('timeframe')

const { t, locale } = useI18n()
const { backtest, running, error, startedAt, run, lookup, reset } = useBacktest()

const PERIODS: BacktestPeriod[] = ['1m', '3m', '6m', '1y', '2y']
const TRADES_COLLAPSED = 20

const formMode = computed(() => !props.bot)
const headingId = computed(() => (props.bot ? `backtest-${props.bot.id}` : 'backtest-form'))
const symbolLabel = computed(() => props.bot?.symbol ?? props.source?.symbol ?? '')
const bfConfig = computed(() => readBilateralConfig(props.bot?.config ?? props.source?.config))
const pickedTimeframe = ref<BacktestTimeframe>(bfConfig.value.signal_timeframe as BacktestTimeframe)
/** The bot page tries other timeframes without touching the bot; the create page switches the form's timeframe. */
const timeframe = computed<BacktestTimeframe>(() => (
  formMode.value ? formTimeframe.value ?? bfConfig.value.signal_timeframe as BacktestTimeframe : pickedTimeframe.value
))

function pickTimeframe(value: BacktestTimeframe) {
  if (formMode.value) formTimeframe.value = value
  else pickedTimeframe.value = value
}

const period = ref<BacktestPeriod>('1y')
const capital = ref<number>(1000)
const reinvest = ref(false)
const showAllTrades = ref(false)

const capitalValid = computed(() => Number.isFinite(capital.value) && capital.value > 0 && capital.value <= 10_000_000)

/** The request for the current choice; null while the form's settings are invalid. */
function request(): BacktestCreate | null {
  const common = {
    timeframe: timeframe.value,
    period: period.value,
    capital_usdt: capital.value,
    reinvest: reinvest.value,
  }
  if (props.bot) return { bot_id: props.bot.id, ...common }
  const source = props.source
  if (!source) return null
  return { bot_type: 'BILATERAL_FUTURES', symbol: source.symbol, exchange: source.exchange, config: source.config, ...common }
}

const canRun = computed(() => capitalValid.value && (props.bot != null || props.source != null))

function start() {
  const body = request()
  if (!body || !capitalValid.value || running.value) return
  showAllTrades.value = false
  void run(body)
}

function lookupNow() {
  const body = request()
  if (!body) {
    reset()  // the form is being edited into an invalid state: an old result would not match it
    return
  }
  void lookup(body)
}

// A new choice (or new settings) shows the saved result for it, if there is one
let lookupTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [
    timeframe.value,
    period.value,
    capital.value,
    reinvest.value,
    props.bot?.config_version ?? '',
    props.source ? JSON.stringify(props.source) : props.bot ? '' : 'invalid',
  ].join('|'),
  () => {
    if (lookupTimer) clearTimeout(lookupTimer)
    if (!capitalValid.value) return
    lookupTimer = setTimeout(() => {
      lookupTimer = null
      lookupNow()
    }, 400)
  },
)
onMounted(() => {
  lookupNow()
})
onScopeDispose(() => {
  if (lookupTimer) clearTimeout(lookupTimer)
})

// Seconds since Run, for the loader
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
watch(running, (value) => {
  if (ticker) clearInterval(ticker)
  ticker = value ? setInterval(() => { now.value = Date.now() }, 1000) : null
  now.value = Date.now()
})
onScopeDispose(() => {
  if (ticker) clearInterval(ticker)
})
const elapsed = computed(() => (startedAt.value == null ? 0 : Math.max(0, Math.round((now.value - startedAt.value) / 1000))))

const done = computed(() => (backtest.value?.status === 'done' ? backtest.value : null))
const result = computed(() => done.value?.result ?? null)
const summary = computed(() => result.value?.summary ?? null)

function usdt(value: number | null | undefined, signed = false) {
  return value == null ? '—' : `${formatUsdt(value, locale.value, signed)} USDT`
}

function percent(value: number | null | undefined, signed = false) {
  return value == null ? '—' : formatPercentValue(value, locale.value, signed)
}

function price(value: number | null | undefined) {
  return value == null ? '—' : formatPrice(value, locale.value)
}

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }))
function day(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dayFormat.value.format(date)
}

const profitFactor = computed(() => {
  const s = summary.value
  if (!s) return '—'
  if (s.profit_factor != null) return formatCount(s.profit_factor, locale.value)
  return s.wins > 0 && s.losses === 0 ? '∞' : '—'
})

const costs = computed(() => {
  const s = summary.value
  if (!s) return null
  return (s.fees ?? 0) + (s.funding ?? 0)
})

const sides = computed(() => {
  const bySide = summary.value?.by_side ?? {}
  return { long: bySide.LONG ?? null, short: bySide.SHORT ?? null }
})

const rangeText = computed(() => {
  const value = done.value
  if (!value || !result.value) return ''
  // The data ends at the start of `end_at`'s day: show the last included day
  const lastDay = new Date(Date.parse(value.end_at) - 1).toISOString()
  return t('bots.backtest_range', {
    exchange: value.exchange,
    symbol: value.symbol,
    tf: value.timeframe,
    start: day(value.start_at),
    end: day(lastDay),
    candles: result.value.period.candles,
  })
})

const computedAt = computed(() => (done.value?.finished_at ? formatDateTime(done.value.finished_at, locale.value) : null))

const monthFormat = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric', timeZone: 'UTC' }))
const months = computed(() => {
  const list = result.value?.monthly ?? []
  const max = Math.max(0, ...list.map(item => Math.abs(item.pnl_net ?? 0)))
  return list.map(item => ({
    ...item,
    label: monthFormat.value.format(new Date(`${item.month}-01T00:00:00Z`)),
    width: max > 0 && item.pnl_net != null ? Math.max(2, (Math.abs(item.pnl_net) / max) * 100) : 0,
  }))
})

/** Newest first, like the bot's own trade list. */
const trades = computed<BacktestTrade[]>(() => [...(result.value?.trades ?? [])].reverse())
const visibleTrades = computed(() => (showAllTrades.value ? trades.value : trades.value.slice(0, TRADES_COLLAPSED)))

function exitReason(reason: string) {
  if (reason === 'end') return t('bots.backtest_exit_end')
  if (reason === 'regime_flip') return t('bots.backtest_exit_flip')
  return trendExitReasonLabel(t, reason)
}

const assumptions = computed(() => {
  const a = result.value?.assumptions
  if (!a) return ''
  return t('bots.backtest_assumptions', {
    capital: formatUsdt(a.capital_usdt, locale.value),
    mode: a.reinvest ? t('bots.backtest_mode_reinvest') : t('bots.backtest_mode_fixed'),
    fee: formatCount(a.fee_pct, locale.value),
    slippage: formatCount(a.slippage_pct, locale.value),
    funding: formatCount(a.funding_pct_8h, locale.value),
  })
})

const settingsUsed = computed(() => {
  const config = (done.value?.params?.config ?? {}) as Record<string, string | number | boolean | null>
  if (!done.value) return ''
  const base = t('bots.backtest_settings_used', {
    risk: config.risk_per_unit_pct ?? '—',
    stop: config.stop_atr ?? '—',
    window: config.bf_window ?? '—',
    reversal: config.bf_reversal ?? '—',
  })
  const trail = Number(config.trail_atr)
  if (!bilateralTrailOn(trail)) return base
  const key = config.trail_wait_flip === true ? 'bots.backtest_settings_trail_wait' : 'bots.backtest_settings_trail'
  return `${base}, ${t(key, { trail: config.trail_atr })}`
})
</script>

<template>
  <section class="detail-panel backtest" :class="{ 'backtest--form': formMode }" :aria-labelledby="headingId">
    <div class="detail-panel__head">
      <h2 :id="headingId" class="detail-panel__title">{{ $t('bots.backtest_title') }}</h2>
      <span v-if="done" class="detail-panel__note">
        <template v-if="done.cached">{{ $t('bots.backtest_cached') }} · </template>{{ computedAt ? $t('bots.backtest_computed_at', { time: computedAt }) : '' }}
      </span>
    </div>
    <p class="detail-panel__hint">{{ formMode ? $t('bots.backtest_intro_form') : $t('bots.backtest_intro') }}</p>

    <div class="backtest__controls">
      <div class="backtest__control">
        <span class="backtest__label">{{ $t('bots.backtest_timeframe') }}</span>
        <UTooltip :text="$t('bots.backtest_timeframe_form_hint')" :disabled="!formMode" :delay-duration="200">
          <div
            class="backtest__group"
            role="group"
            :aria-label="$t('bots.backtest_timeframe')"
            :aria-describedby="formMode ? 'backtest-form-timeframe-hint' : undefined"
          >
            <button
              v-for="item in BILATERAL_SIGNAL_TIMEFRAMES"
              :key="item"
              type="button"
              class="backtest__option"
              :aria-pressed="timeframe === item"
              :disabled="running"
              @click="pickTimeframe(item as BacktestTimeframe)"
            >
              {{ item }}
            </button>
          </div>
        </UTooltip>
        <!-- No hover on a touch screen: the same hint as text there; always there for a screen reader -->
        <span v-if="formMode" id="backtest-form-timeframe-hint" class="backtest__tf-note">{{ $t('bots.backtest_timeframe_form_hint') }}</span>
      </div>
      <div class="backtest__control">
        <span class="backtest__label">{{ $t('bots.backtest_period') }}</span>
        <div class="backtest__group" role="group" :aria-label="$t('bots.backtest_period')">
          <button
            v-for="item in PERIODS"
            :key="item"
            type="button"
            class="backtest__option"
            :aria-pressed="period === item"
            :disabled="running"
            @click="period = item"
          >
            {{ $t(`bots.backtest_period_${item}`) }}
          </button>
        </div>
      </div>
      <label class="backtest__control backtest__capital">
        <span class="backtest__label">{{ $t('bots.backtest_capital') }}</span>
        <UInput v-model.number="capital" type="number" min="1" step="100" size="sm" :disabled="running" :color="capitalValid ? undefined : 'error'" />
      </label>
      <div class="backtest__control backtest__reinvest">
        <UCheckbox v-model="reinvest" :label="$t('bots.backtest_reinvest')" :disabled="running" />
      </div>
      <UButton
        class="backtest__run"
        color="primary"
        icon="i-lucide-play"
        :loading="running"
        :disabled="running || !canRun"
        @click="start"
      >
        {{ $t('bots.backtest_run') }}
      </UButton>
    </div>
    <p class="detail-panel__hint">{{ reinvest ? $t('bots.backtest_reinvest_on_hint') : $t('bots.backtest_reinvest_off_hint', { capital: formatUsdt(capitalValid ? capital : 0, locale) }) }}</p>

    <div v-if="running" class="backtest__loading" role="status" aria-live="polite">
      <span class="backtest__spinner" aria-hidden="true" />
      <div>
        <strong>{{ $t('bots.backtest_running', { seconds: elapsed }) }}</strong>
        <p>{{ $t('bots.backtest_running_hint') }}</p>
      </div>
    </div>

    <UAlert v-if="error && !running" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" role="alert" />

    <template v-if="summary && result && !running">
      <p class="backtest__range">{{ rangeText }}</p>

      <dl class="backtest__grid">
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_pnl') }}</dt>
          <dd class="backtest__big" :class="`tone-${pnlTone(summary.pnl_net)}`">{{ usdt(summary.pnl_net, true) }}</dd>
          <span class="backtest__sub">{{ $t('bots.backtest_pnl_sub', { value: percent(summary.return_pct, true) }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_trades') }}</dt>
          <dd>{{ summary.trades }}</dd>
          <span class="backtest__sub">{{ $t('bots.backtest_trades_sub', { wins: summary.wins, trades: summary.trades, rate: percent(summary.win_rate_pct) }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt :title="$t('bots.trend_stats_profit_factor_hint')">{{ $t('bots.trend_stats_profit_factor') }}</dt>
          <dd>{{ profitFactor }}</dd>
          <span class="backtest__sub">{{ $t('bots.backtest_avg_r', { r: formatR(summary.avg_r, locale) }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt :title="$t('bots.backtest_drawdown_hint')">{{ $t('bots.backtest_drawdown') }}</dt>
          <dd class="tone-down">{{ usdt(summary.max_drawdown_usdt) }}</dd>
          <span class="backtest__sub">{{ $t('bots.backtest_drawdown_sub', { pct: percent(summary.max_drawdown_pct), closed: usdt(summary.closed_max_drawdown_usdt) }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_hold', { symbol: done?.symbol ?? symbolLabel }) }}</dt>
          <dd :class="`tone-${pnlTone(summary.buy_hold_pct)}`">{{ percent(summary.buy_hold_pct, true) }}</dd>
          <span class="backtest__sub">{{ price(summary.price_start) }} → {{ price(summary.price_end) }}</span>
        </div>
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_costs') }}</dt>
          <dd :class="`tone-${pnlTone(costs)}`">{{ usdt(costs, true) }}</dd>
          <span class="backtest__sub">{{ $t('bots.backtest_costs_sub', { fees: usdt(summary.fees, true), funding: usdt(summary.funding, true) }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_sides') }}</dt>
          <dd>
            <span :class="`tone-${pnlTone(sides.long?.pnl_net)}`">{{ sides.long ? formatUsdt(sides.long.pnl_net, locale, true) : '—' }}</span>
            /
            <span :class="`tone-${pnlTone(sides.short?.pnl_net)}`">{{ sides.short ? formatUsdt(sides.short.pnl_net, locale, true) : '—' }}</span>
          </dd>
          <span class="backtest__sub">{{ $t('bots.backtest_sides_sub', { long: sides.long?.trades ?? 0, short: sides.short?.trades ?? 0 }) }}</span>
        </div>
        <div class="backtest__cell">
          <dt>{{ $t('bots.backtest_best_worst') }}</dt>
          <dd>
            <span class="tone-up">{{ summary.best_trade == null ? '—' : formatUsdt(summary.best_trade, locale, true) }}</span>
            /
            <span class="tone-down">{{ summary.worst_trade == null ? '—' : formatUsdt(summary.worst_trade, locale, true) }}</span>
          </dd>
          <span v-if="summary.risk_pauses" class="backtest__sub">{{ $t('bots.backtest_risk_pauses', { count: summary.risk_pauses }) }}</span>
        </div>
      </dl>

      <div v-if="result.equity.length > 1" class="backtest__block">
        <h3 class="backtest__subtitle">{{ $t('bots.backtest_equity_title') }}</h3>
        <BotBacktestEquityChart :points="result.equity" :height="220" :aria-label="$t('bots.backtest_equity_aria', { symbol: done?.symbol ?? symbolLabel })" />
      </div>

      <div v-if="months.length" class="backtest__block">
        <h3 class="backtest__subtitle">{{ $t('bots.backtest_by_month') }}</h3>
        <ul class="backtest__month-list">
          <li v-for="item in months" :key="item.month" class="backtest__month">
            <span class="backtest__month-label">{{ item.label }}</span>
            <span class="backtest__bar-track" aria-hidden="true">
              <span class="backtest__bar" :class="`backtest__bar--${pnlTone(item.pnl_net)}`" :style="{ width: `${item.width}%` }" />
            </span>
            <span class="backtest__month-value" :class="`tone-${pnlTone(item.pnl_net)}`">{{ usdt(item.pnl_net, true) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="trades.length" class="backtest__block">
        <h3 class="backtest__subtitle">{{ $t('bots.backtest_trades_title', { count: trades.length }) }}</h3>
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th scope="col">{{ $t('bots.trend_col_side') }}</th>
                <th scope="col">{{ $t('bots.trend_col_opened') }}</th>
                <th scope="col">{{ $t('bots.trend_col_closed') }}</th>
                <th scope="col" class="num">{{ $t('bots.trend_col_entry') }}</th>
                <th scope="col" class="num">{{ $t('bots.trend_col_exit') }}</th>
                <th scope="col" class="num">{{ $t('bots.backtest_col_notional') }}</th>
                <th scope="col" class="num">{{ $t('bots.trend_col_pnl') }}</th>
                <th scope="col" class="num">R</th>
                <th scope="col">{{ $t('bots.trend_col_exit_reason') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trade in visibleTrades" :key="`${trade.opened_at}-${trade.side}`">
                <td :data-label="$t('bots.trend_col_side')">
                  <span class="backtest__side" :class="{ 'tone-up': trade.side === 'LONG', 'tone-down': trade.side === 'SHORT' }">{{ trade.side }}</span>
                </td>
                <td :data-label="$t('bots.trend_col_opened')">{{ formatDateTime(trade.opened_at, locale) }}</td>
                <td :data-label="$t('bots.trend_col_closed')">{{ formatDateTime(trade.closed_at, locale) }}</td>
                <td class="num" :data-label="$t('bots.trend_col_entry')">{{ price(trade.entry) }}</td>
                <td class="num" :data-label="$t('bots.trend_col_exit')">{{ price(trade.exit) }}</td>
                <td class="num" :data-label="$t('bots.backtest_col_notional')">{{ trade.notional == null ? '—' : formatUsdt(trade.notional, locale) }}</td>
                <td class="num" :class="`tone-${pnlTone(trade.pnl_net)}`" :data-label="$t('bots.trend_col_pnl')">{{ trade.pnl_net == null ? '—' : formatUsdt(trade.pnl_net, locale, true) }}</td>
                <td class="num" :class="`tone-${pnlTone(trade.r_multiple)}`" data-label="R">{{ formatR(trade.r_multiple, locale) }}</td>
                <td :data-label="$t('bots.trend_col_exit_reason')">{{ exitReason(trade.exit_reason) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <UButton
          v-if="trades.length > TRADES_COLLAPSED"
          class="backtest__more"
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="showAllTrades ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          @click="showAllTrades = !showAllTrades"
        >
          {{ showAllTrades ? $t('bots.backtest_show_less') : $t('bots.backtest_show_all', { count: trades.length }) }}
        </UButton>
      </div>
      <p v-else class="detail-panel__empty">{{ $t('bots.backtest_no_trades') }}</p>

      <p v-if="result.open_position" class="detail-panel__hint">{{ $t('bots.backtest_open_end', { side: result.open_position.side }) }}</p>
      <p class="detail-panel__hint">{{ settingsUsed }}. {{ assumptions }}</p>
    </template>
    <p v-else-if="formMode && !source" class="detail-panel__empty">{{ $t('bots.backtest_form_invalid') }}</p>
    <p v-else-if="!running && !error" class="detail-panel__empty">{{ formMode ? $t('bots.backtest_empty_form') : $t('bots.backtest_empty') }}</p>
  </section>
</template>

<style scoped>
.backtest__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
}

.backtest__control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.backtest__label {
  color: var(--color-text-muted);
  font-size: 12px;
}

.backtest__group {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 2px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
}

.backtest__option {
  min-width: 40px;
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
}

.backtest__option[aria-pressed="true"] {
  background: rgb(255 255 255 / 10%);
  color: var(--color-text);
}

.backtest__option:disabled {
  cursor: default;
  opacity: 0.6;
}

.backtest__option:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.backtest__tf-note {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (hover: none) {
  .backtest__tf-note {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
    color: var(--color-text-muted);
    font-size: 11.5px;
    white-space: normal;
  }
}

.backtest__capital {
  width: 130px;
}

.backtest__reinvest {
  padding-bottom: 6px;
}

.backtest__run {
  margin-left: auto;
}

.backtest__loading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgb(196 181 253 / 30%);
  border-radius: 12px;
  background: rgb(196 181 253 / 6%);
}

.backtest__loading strong {
  font-variant-numeric: tabular-nums;
}

.backtest__loading p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.backtest__spinner {
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border: 2px solid rgb(196 181 253 / 25%);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: backtest-spin 0.9s linear infinite;
}

@keyframes backtest-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .backtest__spinner {
    animation-duration: 2.5s;
  }
}

.backtest__range {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.backtest__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.backtest__cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.backtest__cell dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.backtest__cell dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.backtest__big {
  font-size: 1.15rem;
}

.backtest__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.backtest__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.backtest__subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.backtest__month-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.backtest__month {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 120px;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
}

.backtest__month-label {
  color: var(--color-text-muted);
}

.backtest__bar-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 5%);
}

.backtest__bar {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.backtest__bar--up {
  background: var(--color-up);
}

.backtest__bar--down {
  background: var(--color-down);
}

.backtest__bar--flat {
  background: rgb(255 255 255 / 25%);
}

.backtest__month-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.backtest__side {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.backtest__more {
  align-self: flex-start;
}

.tone-up {
  color: var(--color-up);
}

.tone-down {
  color: var(--color-down);
}

/* The create page is a narrow column: two cells per row read better there */
.backtest--form .backtest__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* ...and the trades table fits it when cells may wrap (a date over two lines) instead of scrolling sideways.
   Phones keep the card layout from main.css. */
@media (min-width: 641px) {
  .backtest--form .detail-table {
    font-size: 0.8rem;
  }

  .backtest--form .detail-table th,
  .backtest--form .detail-table td {
    padding-inline: 6px;
    white-space: normal;
  }
}

@media (max-width: 900px) {
  .backtest__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .backtest__run {
    margin-left: 0;
  }
}

@media (max-width: 520px) {
  .backtest__month {
    grid-template-columns: 70px minmax(0, 1fr) 96px;
  }
}
</style>
