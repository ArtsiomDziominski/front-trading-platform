<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, BotListItem, TrendFuturesConfig, TrendSignalTimeframe, TrendTrendTimeframe } from '#shared/types/bot'
import {
  TREND_DEFAULTS,
  TREND_PRESETS,
  TREND_SIGNAL_TIMEFRAMES,
  TREND_TIMEFRAME_MINUTES,
  TREND_TREND_TIMEFRAMES,
} from '~/utils/trend'

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
  | 'max_units'
  | 'capital_usdt'
  | 'exchange_leverage'
  | 'max_notional_x'
  | 'ema_fast'
  | 'ema_slow'
  | 'adx_period'
  | 'adx_min'
  | 'atr_period'
  | 'donchian_entry'
  | 'donchian_exit'
  | 'volume_mult'
  | 'volume_sma_period'
  | 'stop_atr'
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

// Ranges mirror TrendFuturesConfig on the server
const MAIN_FIELDS: NumericField[] = [
  { key: 'risk_per_unit_pct', labelKey: 'bots.trend_field_risk_per_unit_pct', hintKey: 'bots.trend_hint_risk_per_unit_pct', integer: false, min: 0, max: 10, minExclusive: true },
  { key: 'max_units', labelKey: 'bots.trend_field_max_units', hintKey: 'bots.trend_hint_max_units', integer: true, min: 1, max: 10 },
  { key: 'capital_usdt', labelKey: 'bots.trend_field_capital_usdt', hintKey: 'bots.trend_hint_capital_usdt', integer: false, min: 0, max: Number.MAX_SAFE_INTEGER, minExclusive: true },
  { key: 'exchange_leverage', labelKey: 'bots.trend_field_exchange_leverage', hintKey: 'bots.trend_hint_exchange_leverage', integer: true, min: 1, max: 125 },
  { key: 'max_notional_x', labelKey: 'bots.trend_field_max_notional_x', hintKey: 'bots.trend_hint_max_notional_x', integer: false, min: 0, max: 100, minExclusive: true },
]

const ADVANCED_GROUPS: { titleKey: string, fields: NumericField[] }[] = [
  {
    titleKey: 'bots.trend_group_regime',
    fields: [
      { key: 'ema_fast', labelKey: 'bots.trend_field_ema_fast', integer: true, min: 2, max: 500 },
      { key: 'ema_slow', labelKey: 'bots.trend_field_ema_slow', integer: true, min: 3, max: 1000 },
      { key: 'adx_period', labelKey: 'bots.trend_field_adx_period', integer: true, min: 2, max: 100 },
      { key: 'adx_min', labelKey: 'bots.trend_field_adx_min', hintKey: 'bots.trend_hint_adx_min', integer: false, min: 0, max: 100 },
    ],
  },
  {
    titleKey: 'bots.trend_group_entry',
    fields: [
      { key: 'donchian_entry', labelKey: 'bots.trend_field_donchian_entry', hintKey: 'bots.trend_hint_donchian_entry', integer: true, min: 2, max: 500 },
      { key: 'donchian_exit', labelKey: 'bots.trend_field_donchian_exit', hintKey: 'bots.trend_hint_donchian_exit', integer: true, min: 2, max: 500 },
      { key: 'volume_mult', labelKey: 'bots.trend_field_volume_mult', hintKey: 'bots.trend_hint_volume_mult', integer: false, min: 0, max: 20 },
      { key: 'volume_sma_period', labelKey: 'bots.trend_field_volume_sma_period', integer: true, min: 2, max: 200 },
    ],
  },
  {
    titleKey: 'bots.trend_group_stops',
    fields: [
      { key: 'atr_period', labelKey: 'bots.trend_field_atr_period', integer: true, min: 2, max: 100 },
      { key: 'stop_atr', labelKey: 'bots.trend_field_stop_atr', hintKey: 'bots.trend_hint_stop_atr', integer: false, min: 0, max: 20, minExclusive: true },
      { key: 'add_step_atr', labelKey: 'bots.trend_field_add_step_atr', hintKey: 'bots.trend_hint_add_step_atr', integer: false, min: 0, max: 20, minExclusive: true },
      { key: 'trail_atr', labelKey: 'bots.trend_field_trail_atr', hintKey: 'bots.trend_hint_trail_atr', integer: false, min: 0, max: 50, minExclusive: true },
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
  values.risk_per_unit_pct = TREND_PRESETS[0].risk
  return values
}

/** Placeholders show the server default an empty field falls back to. */
function placeholderFor(key: NumericKey): string {
  const value = TREND_DEFAULTS[key]
  return value == null ? '' : String(value)
}

const symbol = ref('BTCUSDT')
const values = reactive<Record<NumericKey, string>>(emptyValues())
const signalTimeframe = ref<TrendSignalTimeframe>(TREND_DEFAULTS.signal_timeframe)
const trendTimeframe = ref<TrendTrendTimeframe>(TREND_DEFAULTS.trend_timeframe)
const closeOnStop = ref(TREND_DEFAULTS.close_on_stop)
const exitOnRegimeFlip = ref(TREND_DEFAULTS.exit_on_regime_flip)
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
const presetTitleId = useId()

const signalItems = TREND_SIGNAL_TIMEFRAMES.map((value) => ({ label: value, value }))
const trendItems = computed(() => TREND_TREND_TIMEFRAMES.map((value) => ({
  label: value,
  value,
  disabled: (TREND_TIMEFRAME_MINUTES[value] ?? 0) <= (TREND_TIMEFRAME_MINUTES[signalTimeframe.value] ?? 0),
})))

const activePreset = computed(() => {
  const risk = Number(values.risk_per_unit_pct.trim().replace(',', '.'))
  return TREND_PRESETS.find((preset) => Number(preset.risk) === risk)?.id ?? null
})

function applyPreset(risk: string) {
  values.risk_per_unit_pct = risk
}

function normalizeDecimal(raw: string): string {
  return raw.trim().replace(',', '.')
}

// --- Trend badge for the selected pair ---

const selectedExchange = computed(() => {
  const key = props.apiKeys.find((item) => item.id === apiKeyId.value)
  // Without a key the badge shows Binance data, the server default
  return key?.exchange ?? 'BINANCE'
})

function validNumber(key: NumericKey): number | undefined {
  const raw = normalizeDecimal(values[key])
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

const trendQuery = computed(() => {
  const symbolValue = symbol.value.trim().toUpperCase()
  if (!symbolValue) return null
  const emaFast = validNumber('ema_fast')
  const emaSlow = validNumber('ema_slow')
  const adxMin = validNumber('adx_min')
  const entry = validNumber('donchian_entry')
  const exit = validNumber('donchian_exit')
  return {
    exchange: selectedExchange.value,
    symbol: symbolValue,
    signal_timeframe: signalTimeframe.value,
    trend_timeframe: trendTimeframe.value,
    ...(emaFast != null ? { ema_fast: emaFast } : {}),
    ...(emaSlow != null ? { ema_slow: emaSlow } : {}),
    ...(adxMin != null ? { adx_min: adxMin } : {}),
    ...(entry != null ? { donchian_entry: entry } : {}),
    ...(exit != null ? { donchian_exit: exit } : {}),
  }
})

const trend = useTrend(trendQuery)

// --- Submit ---

function buildConfig(): TrendFuturesConfig {
  const config: TrendFuturesConfig = {
    symbol: symbol.value.trim().toUpperCase(),
    signal_timeframe: signalTimeframe.value,
    trend_timeframe: trendTimeframe.value,
    exit_on_regime_flip: exitOnRegimeFlip.value,
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

// The server refuses a trend bot next to ANY unclosed bot on the same pair and key: the exchange position is shared
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

  const emaFast = validNumber('ema_fast') ?? TREND_DEFAULTS.ema_fast
  const emaSlow = validNumber('ema_slow') ?? TREND_DEFAULTS.ema_slow
  if (emaFast >= emaSlow) {
    formError.value = t('bots.error_ema_order')
    advancedOpen.value = true
    return false
  }

  if ((TREND_TIMEFRAME_MINUTES[trendTimeframe.value] ?? 0) <= (TREND_TIMEFRAME_MINUTES[signalTimeframe.value] ?? 0)) {
    formError.value = t('bots.trend_error_timeframes')
    advancedOpen.value = true
    return false
  }

  return true
}

async function handleSubmit() {
  resetSubmitState()
  if (!validate()) return

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'TREND_FUTURES',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'TREND_FUTURES') return false

  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as TrendFuturesConfig
  const raw = config as unknown as Record<string, unknown>
  symbol.value = config.symbol
  const next = emptyValues()
  for (const field of ALL_FIELDS) {
    const value = raw[field.key]
    next[field.key] = value == null ? '' : String(value)
  }
  Object.assign(values, next)
  signalTimeframe.value = config.signal_timeframe ?? TREND_DEFAULTS.signal_timeframe
  trendTimeframe.value = config.trend_timeframe ?? TREND_DEFAULTS.trend_timeframe
  closeOnStop.value = config.close_on_stop ?? TREND_DEFAULTS.close_on_stop
  exitOnRegimeFlip.value = config.exit_on_regime_flip ?? TREND_DEFAULTS.exit_on_regime_flip

  resetSubmitState()
  return true
}

// A longer signal timeframe can make the trend one invalid: move it up to the next allowed value
watch(signalTimeframe, (signal) => {
  const signalMinutes = TREND_TIMEFRAME_MINUTES[signal] ?? 0
  if ((TREND_TIMEFRAME_MINUTES[trendTimeframe.value] ?? 0) > signalMinutes) return
  const next = TREND_TREND_TIMEFRAMES.find((value) => (TREND_TIMEFRAME_MINUTES[value] ?? 0) > signalMinutes)
  if (next) trendTimeframe.value = next
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
    <TrendBadge
      :data="trend.data.value"
      :status="trend.status.value"
      :error="trend.error.value"
      @retry="trend.refresh"
    />

    <p class="trend-form__intro">{{ $t('bots.trend_form_intro') }}</p>

    <div class="trend-form__presets">
      <span :id="presetTitleId" class="trend-form__presets-title">{{ $t('bots.trend_presets') }}</span>
      <UFieldGroup size="sm" role="group" :aria-labelledby="presetTitleId">
        <AppButton
          v-for="preset in TREND_PRESETS"
          :key="preset.id"
          type="button"
          :variant="activePreset === preset.id ? 'primary' : 'secondary'"
          :aria-pressed="activePreset === preset.id"
          @click="applyPreset(preset.risk)"
        >
          {{ $t(preset.labelKey) }}
        </AppButton>
      </UFieldGroup>
    </div>

    <div class="field-row">
      <UFormField
        v-for="field in MAIN_FIELDS"
        :key="field.key"
        :label="$t(field.labelKey)"
        :help="field.hintKey ? $t(field.hintKey) : undefined"
        class="flex-1"
      >
        <UInput
          :id="`trend-${field.key}`"
          v-model="values[field.key]"
          :inputmode="field.integer ? 'numeric' : 'decimal'"
          :placeholder="field.key === 'capital_usdt' ? $t('bots.trend_capital_placeholder') : placeholderFor(field.key)"
          class="w-full"
        />
      </UFormField>
    </div>

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

      <div class="field-row">
        <UFormField :label="$t('bots.trend_field_signal_timeframe')" :help="$t('bots.trend_hint_signal_timeframe')" class="flex-1">
          <USelect id="trend-signal-timeframe" v-model="signalTimeframe" :items="signalItems" class="w-full" />
        </UFormField>
        <UFormField :label="$t('bots.trend_field_trend_timeframe')" :help="$t('bots.trend_hint_trend_timeframe')" class="flex-1">
          <USelect id="trend-trend-timeframe" v-model="trendTimeframe" :items="trendItems" class="w-full" />
        </UFormField>
      </div>

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
              :id="`trend-${field.key}`"
              v-model="values[field.key]"
              :inputmode="field.integer ? 'numeric' : 'decimal'"
              :placeholder="placeholderFor(field.key)"
              class="w-full"
            />
          </UFormField>
        </div>
      </fieldset>

      <UCheckbox
        v-model="exitOnRegimeFlip"
        :label="$t('bots.trend_field_exit_on_regime_flip')"
        :description="$t('bots.trend_hint_exit_on_regime_flip')"
      />
    </div>
  </BotCreateFormShell>
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

.trend-form__presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.trend-form__presets-title {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
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
