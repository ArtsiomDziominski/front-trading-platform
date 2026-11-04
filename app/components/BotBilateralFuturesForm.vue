<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BacktestFormSource } from '#shared/types/backtest'
import type { BilateralFuturesConfig, BilateralSignalTimeframe, BotCreate, BotListItem } from '#shared/types/bot'
import {
  BILATERAL_DEFAULTS,
  BILATERAL_FORM_TRAIL_WAIT_FLIP,
  BILATERAL_SETTLE_BARS,
  BILATERAL_SIGNAL_TIMEFRAMES,
  bilateralTrailOn,
} from '~/utils/bilateral'

/**
 * Create form of BILATERAL_FUTURES: the filter, the risk of the position, the stop and capital protection.
 * Below it, a backtest of the settings as they stand in the form.
 */
const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
  existingBots?: BotListItem[]
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })

type NumericKey =
  | 'risk_per_unit_pct'
  | 'stop_atr'
  | 'capital_usdt'
  | 'exchange_leverage'
  | 'max_notional_x'
  | 'bf_window'
  | 'bf_time_sigma'
  | 'bf_range_sigma'
  | 'bf_reversal'
  | 'atr_period'
  | 'max_units'
  | 'add_step_atr'
  | 'trail_atr'
  | 'cooldown_bars'
  | 'daily_stop_pct'
  | 'monthly_stop_pct'

interface NumericField {
  key: NumericKey
  labelKey: string
  hintKey?: string
  /** Integers go to the API as numbers, decimals as strings. */
  integer: boolean
  min: number
  max: number
  /** `min` itself is not allowed. */
  minExclusive?: boolean
}

// Ranges mirror BilateralFuturesConfig on the server
const MAIN_FIELDS: NumericField[] = [
  { key: 'risk_per_unit_pct', labelKey: 'bots.trend_field_risk_per_unit_pct', hintKey: 'bots.trend_hint_risk_per_unit_pct', integer: false, min: 0, max: 10, minExclusive: true },
  { key: 'stop_atr', labelKey: 'bots.trend_field_stop_atr', hintKey: 'bots.trend_hint_stop_atr', integer: false, min: 0, max: 20, minExclusive: true },
  { key: 'capital_usdt', labelKey: 'bots.trend_field_capital_usdt', hintKey: 'bots.trend_hint_capital_usdt', integer: false, min: 0, max: Number.MAX_SAFE_INTEGER, minExclusive: true },
  { key: 'exchange_leverage', labelKey: 'bots.trend_field_exchange_leverage', hintKey: 'bots.trend_hint_exchange_leverage', integer: true, min: 1, max: 125 },
  { key: 'max_notional_x', labelKey: 'bots.trend_field_max_notional_x', hintKey: 'bots.trend_hint_max_notional_x', integer: false, min: 0, max: 100, minExclusive: true },
]

const ADVANCED_GROUPS: { titleKey: string, fields: NumericField[] }[] = [
  {
    titleKey: 'bots.bilateral_group_filter',
    fields: [
      { key: 'bf_window', labelKey: 'bots.bilateral_field_bf_window', hintKey: 'bots.bilateral_hint_bf_window', integer: true, min: 5, max: 300 },
      { key: 'bf_time_sigma', labelKey: 'bots.bilateral_field_bf_time_sigma', hintKey: 'bots.bilateral_hint_bf_time_sigma', integer: false, min: 0, max: 300, minExclusive: true },
      { key: 'bf_range_sigma', labelKey: 'bots.bilateral_field_bf_range_sigma', hintKey: 'bots.bilateral_hint_bf_range_sigma', integer: false, min: 0, max: 20, minExclusive: true },
      { key: 'bf_reversal', labelKey: 'bots.bilateral_field_bf_reversal', hintKey: 'bots.bilateral_hint_bf_reversal', integer: false, min: 0, max: 20, minExclusive: true },
      { key: 'atr_period', labelKey: 'bots.trend_field_atr_period', integer: true, min: 2, max: 100 },
    ],
  },
  {
    titleKey: 'bots.bilateral_group_position',
    fields: [
      { key: 'max_units', labelKey: 'bots.trend_field_max_units', hintKey: 'bots.trend_hint_max_units', integer: true, min: 1, max: 10 },
      { key: 'add_step_atr', labelKey: 'bots.trend_field_add_step_atr', hintKey: 'bots.trend_hint_add_step_atr', integer: false, min: 0, max: 20, minExclusive: true },
      { key: 'trail_atr', labelKey: 'bots.trend_field_trail_atr', hintKey: 'bots.bilateral_hint_trail_atr', integer: false, min: 0, max: 50, minExclusive: true },
      { key: 'cooldown_bars', labelKey: 'bots.trend_field_cooldown_bars', hintKey: 'bots.trend_hint_cooldown_bars', integer: true, min: 0, max: 500 },
    ],
  },
  {
    titleKey: 'bots.trend_group_protection',
    fields: [
      { key: 'daily_stop_pct', labelKey: 'bots.trend_field_daily_stop_pct', hintKey: 'bots.trend_hint_daily_stop_pct', integer: false, min: 0, max: 100 },
      { key: 'monthly_stop_pct', labelKey: 'bots.trend_field_monthly_stop_pct', hintKey: 'bots.trend_hint_monthly_stop_pct', integer: false, min: 0, max: 100 },
    ],
  },
]

const ALL_FIELDS = [...MAIN_FIELDS, ...ADVANCED_GROUPS.flatMap((group) => group.fields)]

function emptyValues(): Record<NumericKey, string> {
  const values = Object.fromEntries(ALL_FIELDS.map((field) => [field.key, ''])) as Record<NumericKey, string>
  values.risk_per_unit_pct = String(BILATERAL_DEFAULTS.risk_per_unit_pct)
  return values
}

/** Placeholders show the server default an empty field falls back to. */
function placeholderFor(key: NumericKey): string {
  const value = BILATERAL_DEFAULTS[key]
  return value == null ? '' : String(value)
}

const symbol = ref('BTCUSDT')
const values = reactive<Record<NumericKey, string>>(emptyValues())
const signalTimeframe = ref<BilateralSignalTimeframe>(BILATERAL_DEFAULTS.signal_timeframe)
const spikeRejection = ref(BILATERAL_DEFAULTS.bf_spike_rejection)
const trailWaitFlip = ref(BILATERAL_FORM_TRAIL_WAIT_FLIP)
const closeOnStop = ref(BILATERAL_DEFAULTS.close_on_stop)
const advancedOpen = ref(false)

const { t } = useI18n()
const {
  creating,
  formError,
  engineWarning,
  createdBotId,
  resetSubmitState,
  validateBase,
  submit,
} = useBotCreateSubmit(() => emit('created'))

const shellRef = ref<{ scrollIntoView: () => void } | null>(null)

const signalItems = BILATERAL_SIGNAL_TIMEFRAMES.map((value) => ({ label: value, value }))

function normalizeDecimal(raw: string): string {
  return raw.trim().replace(',', '.')
}

/** The checkbox only matters with trailing on: an empty field means the server default, 50 (off). */
const trailOn = computed(() => {
  const raw = normalizeDecimal(values.trail_atr)
  return bilateralTrailOn(raw ? Number(raw) : BILATERAL_DEFAULTS.trail_atr)
})

const warmupNote = computed(() => {
  const window = Number(normalizeDecimal(values.bf_window)) || BILATERAL_DEFAULTS.bf_window
  return t('bots.bilateral_warmup_note', { bars: window + BILATERAL_SETTLE_BARS, tf: signalTimeframe.value })
})

// --- Submit ---

function buildConfig(): BilateralFuturesConfig {
  const config: BilateralFuturesConfig = {
    symbol: symbol.value.trim().toUpperCase(),
    signal_timeframe: signalTimeframe.value,
    bf_spike_rejection: spikeRejection.value,
    trail_wait_flip: trailWaitFlip.value,
    close_on_stop: closeOnStop.value,
  }
  const target = config as unknown as Record<string, unknown>
  for (const field of ALL_FIELDS) {
    const raw = normalizeDecimal(values[field.key])
    if (!raw) continue
    target[field.key] = field.integer ? Number(raw) : raw
  }
  return config
}

// The server refuses a futures bot next to ANY unclosed bot on the same pair and key: the exchange position is shared
function isSymbolTaken(symbolValue: string): boolean {
  return (props.existingBots ?? []).some((bot) =>
    bot.symbol === symbolValue
    && bot.api_key_id === apiKeyId.value
    && bot.lifecycle_status !== 'CLOSED'
    && !bot.deleted_at,
  )
}

function validateField(field: NumericField): string | null {
  const raw = normalizeDecimal(values[field.key])
  if (!raw) return null
  const label = t(field.labelKey)
  const value = Number(raw)
  if (!Number.isFinite(value)) return t('bots.trend_error_number', { field: label })
  if (field.integer && !Number.isInteger(value)) return t('bots.trend_error_integer', { field: label })
  const belowMin = field.minExclusive ? value <= field.min : value < field.min
  if (belowMin || value > field.max) {
    if (field.max === Number.MAX_SAFE_INTEGER) return t('bots.trend_error_positive', { field: label })
    return field.minExclusive
      ? t('bots.trend_error_range_exclusive', { field: label, min: field.min, max: field.max })
      : t('bots.trend_error_range', { field: label, min: field.min, max: field.max })
  }
  return null
}

function validate(): boolean {
  if (!validateBase(apiKeyId.value, symbol.value)) return false

  const apiKey = props.apiKeys.find((item) => item.id === apiKeyId.value)
  if (apiKey && apiKey.exchange !== 'BINANCE' && apiKey.exchange !== 'OKX') {
    formError.value = t('bots.trend_error_exchange')
    return false
  }

  if (isSymbolTaken(symbol.value.trim().toUpperCase())) {
    formError.value = t('bots.trend_error_symbol_duplicate')
    return false
  }

  if (!normalizeDecimal(values.risk_per_unit_pct)) {
    formError.value = t('bots.trend_error_risk_required')
    return false
  }

  for (const field of ALL_FIELDS) {
    const error = validateField(field)
    if (error) {
      formError.value = error
      if (!MAIN_FIELDS.includes(field)) advancedOpen.value = true
      return false
    }
  }

  return true
}

async function handleSubmit() {
  resetSubmitState()
  if (!validate()) return

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'BILATERAL_FUTURES',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'BILATERAL_FUTURES') return false

  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as BilateralFuturesConfig
  const raw = config as unknown as Record<string, unknown>
  symbol.value = config.symbol
  const next = emptyValues()
  for (const field of ALL_FIELDS) {
    const value = raw[field.key]
    next[field.key] = value == null ? '' : String(value)
  }
  Object.assign(values, next)
  signalTimeframe.value = config.signal_timeframe ?? BILATERAL_DEFAULTS.signal_timeframe
  spikeRejection.value = config.bf_spike_rejection ?? BILATERAL_DEFAULTS.bf_spike_rejection
  // A bot saved before the setting existed re-enters after a trailing exit: the clone keeps that
  trailWaitFlip.value = config.trail_wait_flip ?? BILATERAL_DEFAULTS.trail_wait_flip
  closeOnStop.value = config.close_on_stop ?? BILATERAL_DEFAULTS.close_on_stop

  resetSubmitState()
  return true
}

// --- Backtest of the form's settings ---

/** Candles come from the exchange of the chosen API key (public market data); OKX when there is none. */
const backtestExchange = computed<BacktestFormSource['exchange']>(() => {
  const key = props.apiKeys.find((item) => item.id === apiKeyId.value) ?? props.apiKeys[0]
  return key?.exchange === 'BINANCE' ? 'BINANCE' : 'OKX'
})

/** The settings as the server would get them on submit; null while a field is invalid. */
const backtestSource = computed<BacktestFormSource | null>(() => {
  const symbolValue = symbol.value.trim().toUpperCase()
  if (symbolValue.length < 3 || !normalizeDecimal(values.risk_per_unit_pct)) return null
  if (ALL_FIELDS.some((field) => validateField(field) != null)) return null
  return {
    symbol: symbolValue,
    exchange: backtestExchange.value,
    config: buildConfig() as unknown as Record<string, unknown>,
  }
})

function scrollIntoView() {
  shellRef.value?.scrollIntoView()
}

defineExpose({ applyPayload, scrollIntoView })
</script>

<template>
  <BotCreateFormShell
    ref="shellRef"
    v-model:api-key-id="apiKeyId"
    v-model:symbol="symbol"
    :api-keys="apiKeys"
    :show-clone-notice="showCloneNotice"
    :creating="creating"
    :form-error="formError"
    :engine-warning="engineWarning"
    :created-bot-id="createdBotId"
    @submit="handleSubmit"
  >
    <p class="trend-form__intro">{{ $t('bots.bilateral_form_intro') }}</p>

    <div class="field-row">
      <UFormField :label="$t('bots.trend_field_signal_timeframe')" :help="$t('bots.bilateral_hint_signal_timeframe')" class="flex-1">
        <USelect id="bilateral-signal-timeframe" v-model="signalTimeframe" :items="signalItems" class="w-full" />
      </UFormField>
      <UFormField
        v-for="field in MAIN_FIELDS"
        :key="field.key"
        :label="$t(field.labelKey)"
        :help="field.hintKey ? $t(field.hintKey) : undefined"
        class="flex-1"
      >
        <UInput
          :id="`bilateral-${field.key}`"
          v-model="values[field.key]"
          :inputmode="field.integer ? 'numeric' : 'decimal'"
          :placeholder="field.key === 'capital_usdt' ? $t('bots.trend_capital_placeholder') : placeholderFor(field.key)"
          class="w-full"
        />
      </UFormField>
    </div>

    <p class="trend-form__hint">{{ warmupNote }}</p>

    <UCheckbox v-model="closeOnStop" :label="$t('bots.trend_field_close_on_stop')" :description="$t('bots.trend_hint_close_on_stop')" />

    <AppButton
      type="button"
      variant="secondary"
      size="sm"
      class="trend-form__advanced-toggle"
      :trailing-icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :aria-expanded="advancedOpen"
      @click="advancedOpen = !advancedOpen"
    >
      {{ $t('bots.am_advanced_settings') }}
    </AppButton>

    <div v-if="advancedOpen" class="trend-form__advanced">
      <p class="trend-form__hint">{{ $t('bots.am_advanced_settings_hint') }}</p>

      <fieldset v-for="group in ADVANCED_GROUPS" :key="group.titleKey" class="trend-form__group">
        <legend class="trend-form__group-title">{{ $t(group.titleKey) }}</legend>
        <div class="field-row">
          <UFormField
            v-for="field in group.fields"
            :key="field.key"
            :label="$t(field.labelKey)"
            :help="field.hintKey ? $t(field.hintKey) : undefined"
            class="flex-1"
          >
            <UInput
              :id="`bilateral-${field.key}`"
              v-model="values[field.key]"
              :inputmode="field.integer ? 'numeric' : 'decimal'"
              :placeholder="placeholderFor(field.key)"
              class="w-full"
            />
          </UFormField>
        </div>
        <UCheckbox
          v-if="group.titleKey === 'bots.bilateral_group_filter'"
          v-model="spikeRejection"
          :label="$t('bots.bilateral_field_bf_spike_rejection')"
          :description="$t('bots.bilateral_hint_bf_spike_rejection')"
        />
        <UCheckbox
          v-if="group.titleKey === 'bots.bilateral_group_position' && trailOn"
          v-model="trailWaitFlip"
          :label="$t('bots.bilateral_field_trail_wait_flip')"
          :description="$t('bots.bilateral_hint_trail_wait_flip')"
        />
      </fieldset>
    </div>
  </BotCreateFormShell>

  <BotDetailBacktest v-model:timeframe="signalTimeframe" :source="backtestSource" />
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.trend-form__intro {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.trend-form__advanced-toggle {
  align-self: flex-start;
}

.trend-form__advanced {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.trend-form__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.trend-form__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.trend-form__group-title {
  margin-bottom: 4px;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
