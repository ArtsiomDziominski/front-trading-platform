<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, DcaSpotConfig } from '#shared/types/bot'
import {
  buildDcaConfig,
  buildDcaLadder,
  DCA_FORM_DEFAULTS,
  DCA_LIMITS,
  DCA_SERVER_DEFAULTS,
  DCA_TYPICAL_MIN_ORDER_USDT,
  type DcaLadderRow,
} from '~/utils/dcaSpot'
import { formatPercentValue, formatPrice, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'

const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })

type TakeProfitKind = 'fixed' | 'trailing'

type FieldKey =
  | 'base_order_usdt'
  | 'safety_order_usdt'
  | 'safety_orders_count'
  | 'price_deviation_percent'
  | 'step_scale'
  | 'volume_scale'
  | 'take_profit_percent'
  | 'trailing_take_profit_percent'
  | 'stop_loss_percent'
  | 'restart_delay_seconds'

const SUPPORTED_EXCHANGES: ApiKeyOut['exchange'][] = ['BINANCE', 'OKX']
/** The ladder table shows this many rows until «show all» is pressed: 50 safety orders are a long list on a phone. */
const LADDER_PREVIEW_ROWS = 7

const symbol = ref(DCA_FORM_DEFAULTS.symbol)
const values = reactive<Record<FieldKey, string>>(defaultValues())
const takeProfitKind = ref<TakeProfitKind>('fixed')
const stopLossEnabled = ref(false)
const autoRestart = ref(DCA_SERVER_DEFAULTS.auto_restart)
const ladderExpanded = ref(false)
/** Required-but-empty fields are flagged only after the first submit; wrong values are flagged as they are typed. */
const submitted = ref(false)

const { t, locale } = useI18n()
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
const tpModeTitleId = useId()

function defaultValues(): Record<FieldKey, string> {
  return {
    base_order_usdt: DCA_FORM_DEFAULTS.base_order_usdt,
    safety_order_usdt: DCA_FORM_DEFAULTS.safety_order_usdt,
    safety_orders_count: DCA_FORM_DEFAULTS.safety_orders_count,
    price_deviation_percent: DCA_FORM_DEFAULTS.price_deviation_percent,
    step_scale: DCA_FORM_DEFAULTS.step_scale,
    volume_scale: DCA_FORM_DEFAULTS.volume_scale,
    take_profit_percent: DCA_FORM_DEFAULTS.take_profit_percent,
    trailing_take_profit_percent: DCA_FORM_DEFAULTS.trailing_take_profit_percent,
    stop_loss_percent: DCA_FORM_DEFAULTS.stop_loss_percent,
    restart_delay_seconds: DCA_FORM_DEFAULTS.restart_delay_seconds,
  }
}

/** UInput may still write a number into v-model at runtime; commas are accepted as decimal separators. */
function normalized(value: unknown): string {
  return String(value ?? '').trim().replace(',', '.')
}

function parsed(key: FieldKey): number | null {
  const raw = normalized(values[key])
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

// --- API keys: spot DCA runs on Binance and OKX only ---

const spotKeys = computed(() => props.apiKeys.filter((key) => SUPPORTED_EXCHANGES.includes(key.exchange)))
const selectedKey = computed(() => props.apiKeys.find((key) => key.id === apiKeyId.value))

// The page preselects the only key the user has, even if it is not a Binance / OKX one
watch(() => [apiKeyId.value, spotKeys.value.length] as const, ([id]) => {
  if (id === '') {
    const onlyKey = spotKeys.value.length === 1 ? spotKeys.value[0] : undefined
    if (onlyKey) apiKeyId.value = onlyKey.id
    return
  }
  if (selectedKey.value && !SUPPORTED_EXCHANGES.includes(selectedKey.value.exchange)) apiKeyId.value = ''
}, { immediate: true })

// --- Field validation (mirrors DcaSpotConfig on the server) ---

interface FieldRule {
  labelKey: string
  integer?: boolean
  min: number
  /** `min` itself is not allowed. */
  minExclusive?: boolean
  max: number
  /** `max` itself is not allowed. */
  maxExclusive?: boolean
}

const RULES: Record<FieldKey, FieldRule> = {
  base_order_usdt: { labelKey: 'bots.dca_field_base_order', min: 0, minExclusive: true, max: DCA_LIMITS.order_usdt_max },
  safety_order_usdt: { labelKey: 'bots.dca_field_safety_order', min: 0, minExclusive: true, max: DCA_LIMITS.order_usdt_max },
  safety_orders_count: { labelKey: 'bots.dca_field_safety_count', integer: true, min: 0, max: DCA_LIMITS.safety_orders_count_max },
  price_deviation_percent: { labelKey: 'bots.dca_field_deviation', min: 0, minExclusive: true, max: DCA_LIMITS.price_deviation_percent_max },
  step_scale: { labelKey: 'bots.dca_field_step_scale', min: DCA_LIMITS.scale_min, max: DCA_LIMITS.scale_max },
  volume_scale: { labelKey: 'bots.dca_field_volume_scale', min: DCA_LIMITS.scale_min, max: DCA_LIMITS.scale_max },
  take_profit_percent: { labelKey: 'bots.dca_field_take_profit', min: 0, minExclusive: true, max: DCA_LIMITS.take_profit_percent_max },
  trailing_take_profit_percent: { labelKey: 'bots.dca_field_trailing', min: 0, minExclusive: true, max: DCA_LIMITS.trailing_take_profit_percent_max },
  stop_loss_percent: { labelKey: 'bots.dca_field_stop_loss', min: 0, minExclusive: true, max: DCA_LIMITS.stop_loss_percent_max, maxExclusive: true },
  restart_delay_seconds: { labelKey: 'bots.dca_field_restart_delay', integer: true, min: 0, max: DCA_LIMITS.restart_delay_seconds_max },
}

/** Fields the bot uses with the current switches; hidden ones are neither checked nor sent. */
const activeFields = computed<FieldKey[]>(() => {
  // Without safety orders the deviation and the scales mean nothing, but the server still checks them
  const keys: FieldKey[] = [
    'base_order_usdt',
    'safety_order_usdt',
    'safety_orders_count',
    'price_deviation_percent',
    'step_scale',
    'volume_scale',
    'take_profit_percent',
  ]
  if (takeProfitKind.value === 'trailing') keys.push('trailing_take_profit_percent')
  if (stopLossEnabled.value) keys.push('stop_loss_percent')
  if (autoRestart.value) keys.push('restart_delay_seconds')
  return keys
})

function formatLimit(value: number): string {
  return formatPrice(value, locale.value)
}

function ruleError(key: FieldKey): string | null {
  const rule = RULES[key]
  const field = t(rule.labelKey)
  const raw = normalized(values[key])
  if (!raw) return submitted.value ? t('bots.dca_error_required', { field }) : null
  const value = Number(raw)
  if (!Number.isFinite(value)) return t('bots.dca_error_number', { field })
  if (rule.integer && !Number.isInteger(value)) return t('bots.dca_error_integer', { field })
  const belowMin = rule.minExclusive ? value <= rule.min : value < rule.min
  const aboveMax = rule.maxExclusive ? value >= rule.max : value > rule.max
  if (!belowMin && !aboveMax) return null
  if (rule.min === 0 && rule.minExclusive && belowMin) return t('bots.dca_error_positive', { field })
  if (rule.maxExclusive) return t('bots.dca_error_range_below', { field, min: formatLimit(rule.min), max: formatLimit(rule.max) })
  if (rule.minExclusive) return t('bots.dca_error_range_exclusive', { field, min: formatLimit(rule.min), max: formatLimit(rule.max) })
  return t('bots.dca_error_range', { field, min: formatLimit(rule.min), max: formatLimit(rule.max) })
}

const fieldErrors = computed<Partial<Record<FieldKey, string>>>(() => {
  const result: Partial<Record<FieldKey, string>> = {}
  for (const key of activeFields.value) {
    const error = ruleError(key)
    if (error) result[key] = error
  }
  return result
})

/** `BTC/USDT`, `BTC-USDT` (OKX) and `BTC_USDT` as copied from an exchange become `BTCUSDT`. */
const symbolValue = computed(() => symbol.value.trim().toUpperCase().replace(/[\s/_-]/g, ''))

// Same rule as the server (alphanumeric, ends with USDT, up to 64 characters), so it never answers with a raw 422
const symbolError = computed(() => {
  const value = symbolValue.value
  if (!value) return null
  return /^[A-Z0-9]+USDT$/.test(value) && value.length <= 64 ? null : t('bots.dca_error_symbol')
})

// --- Live ladder preview ---

const ladderParams = computed(() => {
  const keys: FieldKey[] = ['base_order_usdt', 'safety_order_usdt', 'safety_orders_count', 'price_deviation_percent', 'step_scale', 'volume_scale', 'take_profit_percent']
  if (keys.some((key) => fieldErrors.value[key] || parsed(key) == null)) return null
  return {
    baseOrderUsdt: parsed('base_order_usdt') ?? 0,
    safetyOrderUsdt: parsed('safety_order_usdt') ?? 0,
    safetyOrdersCount: parsed('safety_orders_count') ?? 0,
    priceDeviationPercent: parsed('price_deviation_percent') ?? 0,
    stepScale: parsed('step_scale') ?? 0,
    volumeScale: parsed('volume_scale') ?? 0,
    takeProfitPercent: parsed('take_profit_percent') ?? 0,
  }
})

const ladder = computed<DcaLadderRow[]>(() => (ladderParams.value ? buildDcaLadder(ladderParams.value) : []))
const deepestRow = computed(() => ladder.value.at(-1) ?? null)
const deepestDeviation = computed(() => deepestRow.value?.deviationPercent ?? 0)
const maxFundsUsdt = computed(() => deepestRow.value?.cumulativeUsdt ?? null)
/** The server refuses a ladder whose deepest order would be at or below zero. */
const depthError = computed(() => (ladder.value.length && deepestDeviation.value >= 100
  ? t('bots.dca_error_depth', { value: formatPercentValue(deepestDeviation.value, locale.value) })
  : null))

const visibleLadder = computed(() => (ladderExpanded.value ? ladder.value : ladder.value.slice(0, LADDER_PREVIEW_ROWS)))
const hiddenRows = computed(() => Math.max(0, ladder.value.length - visibleLadder.value.length))

const priceQuery = computed(() => (symbolError.value || !symbolValue.value
  ? null
  : { exchange: selectedKey.value?.exchange ?? 'BINANCE', symbol: symbolValue.value }))
const spotPrice = useSpotPrice(priceQuery)
const currentPrice = computed(() => spotPrice.data.value?.price ?? null)
const coin = computed(() => baseCoinFromSymbol(symbolValue.value) ?? '')

const priceNote = computed(() => {
  switch (spotPrice.status.value) {
    case 'loading': return t('bots.dca_preview_price_loading')
    case 'not_found': return t('bots.dca_preview_price_not_found', { symbol: symbolValue.value })
    case 'error': return t('bots.dca_preview_price_error')
    case 'ready': return currentPrice.value == null
      ? ''
      : t('bots.dca_preview_price_now', {
          price: formatPrice(currentPrice.value, locale.value),
          exchange: spotPrice.data.value?.exchange === 'OKX' ? 'OKX' : 'Binance',
        })
    default: return t('bots.dca_preview_price_idle')
  }
})

function ratioPrice(ratio: number): string {
  return currentPrice.value == null ? '—' : formatPrice(currentPrice.value * ratio, locale.value)
}

function ratioPercent(ratio: number): string {
  return formatPercentValue((ratio - 1) * 100, locale.value, true)
}

function usdt(value: number): string {
  return `${formatUsdt(value, locale.value)}\u00A0USDT`
}

function rowTitle(row: DcaLadderRow): string {
  return row.index === 0 ? t('bots.dca_order_base') : t('bots.dca_order_safety', { n: row.index })
}

/** Soft warnings: the bot can still be created, the user should know. */
const warnings = computed<string[]>(() => {
  const result: string[] = []
  const params = ladderParams.value
  if (!params) return result

  const smallest = Math.min(params.baseOrderUsdt, params.safetyOrdersCount > 0 ? params.safetyOrderUsdt * Math.min(1, params.volumeScale ** (params.safetyOrdersCount - 1)) : Infinity)
  if (smallest < DCA_TYPICAL_MIN_ORDER_USDT) {
    result.push(t('bots.dca_warning_small_order', { min: DCA_TYPICAL_MIN_ORDER_USDT }))
  }

  // Stop loss fires once the price is sl% below the average: deeper safety orders would never fill
  const sl = stopLossEnabled.value && !fieldErrors.value.stop_loss_percent ? parsed('stop_loss_percent') : null
  if (sl != null) {
    const rows = ladder.value
    for (let index = 0; index < rows.length - 1; index += 1) {
      const current = rows[index]
      const next = rows[index + 1]
      if (current && next && current.avgRatio * (1 - sl / 100) >= next.priceRatio) {
        result.push(t('bots.dca_warning_stop_before_safety', { n: next.index }))
        break
      }
    }
  }

  const trailing = takeProfitKind.value === 'trailing' && !fieldErrors.value.trailing_take_profit_percent
    ? parsed('trailing_take_profit_percent')
    : null
  if (trailing != null && trailing >= params.takeProfitPercent) {
    result.push(t('bots.dca_warning_trailing_wide'))
  }

  return result
})

const takeProfitHint = computed(() => (takeProfitKind.value === 'trailing'
  ? t('bots.dca_tp_trailing_hint')
  : t('bots.dca_tp_fixed_hint')))

const restartDelayHint = computed(() => {
  const seconds = parsed('restart_delay_seconds')
  if (seconds == null || seconds <= 0 || fieldErrors.value.restart_delay_seconds) return t('bots.dca_hint_restart_delay')
  const minutes = seconds / 60
  return minutes >= 1
    ? t('bots.dca_hint_restart_delay_minutes', { value: formatPrice(minutes, locale.value, minutes % 1 ? 1 : 0) })
    : t('bots.dca_hint_restart_delay')
})

// --- Submit ---

function validate(): boolean {
  if (!validateBase(apiKeyId.value, symbolValue.value)) return false

  if (selectedKey.value && !SUPPORTED_EXCHANGES.includes(selectedKey.value.exchange)) {
    formError.value = t('bots.dca_error_exchange')
    return false
  }

  if (symbolError.value) {
    formError.value = symbolError.value
    return false
  }

  const firstError = activeFields.value.map((key) => fieldErrors.value[key]).find(Boolean)
  if (firstError) {
    formError.value = firstError
    return false
  }

  if (depthError.value) {
    formError.value = depthError.value
    return false
  }

  return true
}

function buildConfig(): DcaSpotConfig {
  const integer = (key: FieldKey, fallback: number) => {
    const value = parsed(key)
    return value == null ? fallback : Math.trunc(value)
  }
  return buildDcaConfig({
    symbol: symbolValue.value,
    baseOrderUsdt: normalized(values.base_order_usdt),
    safetyOrderUsdt: normalized(values.safety_order_usdt),
    safetyOrdersCount: integer('safety_orders_count', DCA_SERVER_DEFAULTS.safety_orders_count),
    priceDeviationPercent: normalized(values.price_deviation_percent),
    stepScale: normalized(values.step_scale),
    volumeScale: normalized(values.volume_scale),
    takeProfitPercent: normalized(values.take_profit_percent),
    trailingTakeProfitPercent: takeProfitKind.value === 'trailing' ? normalized(values.trailing_take_profit_percent) : null,
    stopLossPercent: stopLossEnabled.value ? normalized(values.stop_loss_percent) : null,
    autoRestart: autoRestart.value,
    restartDelaySeconds: autoRestart.value ? integer('restart_delay_seconds', DCA_SERVER_DEFAULTS.restart_delay_seconds) : 0,
  })
}

async function handleSubmit() {
  resetSubmitState()
  submitted.value = true
  if (!validate()) return

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'DCA_SPOT',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'DCA_SPOT') return false

  const keyExists = keys.some((key) => key.id === payload.api_key_id && SUPPORTED_EXCHANGES.includes(key.exchange))
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as DcaSpotConfig
  const text = (value: unknown, fallback: string) => (value == null || value === '' ? fallback : String(value))
  symbol.value = config.symbol

  const trailing = config.trailing_take_profit_percent
  const stopLoss = config.stop_loss_percent
  Object.assign(values, {
    base_order_usdt: text(config.base_order_usdt, ''),
    safety_order_usdt: text(config.safety_order_usdt, ''),
    safety_orders_count: text(config.safety_orders_count, String(DCA_SERVER_DEFAULTS.safety_orders_count)),
    price_deviation_percent: text(config.price_deviation_percent, String(DCA_SERVER_DEFAULTS.price_deviation_percent)),
    step_scale: text(config.step_scale, String(DCA_SERVER_DEFAULTS.step_scale)),
    volume_scale: text(config.volume_scale, String(DCA_SERVER_DEFAULTS.volume_scale)),
    take_profit_percent: text(config.take_profit_percent, String(DCA_SERVER_DEFAULTS.take_profit_percent)),
    trailing_take_profit_percent: text(trailing, DCA_FORM_DEFAULTS.trailing_take_profit_percent),
    stop_loss_percent: text(stopLoss, DCA_FORM_DEFAULTS.stop_loss_percent),
    restart_delay_seconds: text(config.restart_delay_seconds, String(DCA_SERVER_DEFAULTS.restart_delay_seconds)),
  } satisfies Record<FieldKey, string>)
  takeProfitKind.value = trailing != null && Number(trailing) > 0 ? 'trailing' : 'fixed'
  stopLossEnabled.value = stopLoss != null && Number(stopLoss) > 0
  autoRestart.value = config.auto_restart ?? DCA_SERVER_DEFAULTS.auto_restart
  ladderExpanded.value = false
  submitted.value = false

  resetSubmitState()
  return true
}

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
    :api-keys="spotKeys"
    :show-clone-notice="showCloneNotice"
    :creating="creating"
    :form-error="formError"
    :engine-warning="engineWarning"
    :created-bot-id="createdBotId"
    @submit="handleSubmit"
  >
    <p v-if="symbolError" class="dca-form__field-error" role="alert">{{ symbolError }}</p>
    <UAlert
      v-if="!spotKeys.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-key-round"
      :title="$t('bots.dca_no_spot_keys')"
    />

    <p class="dca-form__intro">{{ $t('bots.dca_form_intro') }}</p>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('bots.dca_notice_title')"
      class="dca-form__notice"
    >
      <template #description>
        <ul class="dca-form__notice-list">
          <li>{{ $t('bots.dca_notice_permission') }}</li>
          <li>{{ $t('bots.dca_notice_own_coins') }}</li>
          <li>{{ $t('bots.dca_notice_balance') }}</li>
        </ul>
      </template>
    </UAlert>

    <fieldset class="dca-form__group">
      <legend class="dca-form__group-title">{{ $t('bots.dca_group_orders') }}</legend>
      <div class="field-row">
        <UFormField :label="$t('bots.dca_field_base_order')" :help="$t('bots.dca_hint_base_order')" :error="fieldErrors.base_order_usdt" class="flex-1">
          <UInput id="dca-base-order" v-model="values.base_order_usdt" inputmode="decimal" placeholder="20" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('bots.dca_field_safety_order')" :help="$t('bots.dca_hint_safety_order')" :error="fieldErrors.safety_order_usdt" class="flex-1">
          <UInput id="dca-safety-order" v-model="values.safety_order_usdt" inputmode="decimal" placeholder="20" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
      </div>
      <div class="field-row">
        <UFormField :label="$t('bots.dca_field_safety_count')" :help="$t('bots.dca_hint_safety_count')" :error="fieldErrors.safety_orders_count" class="flex-1">
          <UInput id="dca-safety-count" v-model="values.safety_orders_count" inputmode="numeric" placeholder="5" class="w-full" />
        </UFormField>
        <UFormField :label="$t('bots.dca_field_deviation')" :help="$t('bots.dca_hint_deviation')" :error="fieldErrors.price_deviation_percent" class="flex-1">
          <UInput id="dca-deviation" v-model="values.price_deviation_percent" inputmode="decimal" placeholder="1.5" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">%</span></template>
          </UInput>
        </UFormField>
      </div>
      <div class="field-row">
        <UFormField :label="$t('bots.dca_field_step_scale')" :help="$t('bots.dca_hint_step_scale')" :error="fieldErrors.step_scale" class="flex-1">
          <UInput id="dca-step-scale" v-model="values.step_scale" inputmode="decimal" placeholder="1" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">×</span></template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('bots.dca_field_volume_scale')" :help="$t('bots.dca_hint_volume_scale')" :error="fieldErrors.volume_scale" class="flex-1">
          <UInput id="dca-volume-scale" v-model="values.volume_scale" inputmode="decimal" placeholder="1" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">×</span></template>
          </UInput>
        </UFormField>
      </div>
    </fieldset>

    <fieldset class="dca-form__group">
      <legend class="dca-form__group-title">{{ $t('bots.dca_group_take_profit') }}</legend>
      <div class="dca-form__modes">
        <span :id="tpModeTitleId" class="dca-form__modes-title">{{ $t('bots.dca_tp_mode') }}</span>
        <UFieldGroup size="sm" role="group" :aria-labelledby="tpModeTitleId">
          <AppButton
            type="button"
            :variant="takeProfitKind === 'fixed' ? 'primary' : 'secondary'"
            :aria-pressed="takeProfitKind === 'fixed'"
            @click="takeProfitKind = 'fixed'"
          >
            {{ $t('bots.dca_tp_fixed') }}
          </AppButton>
          <AppButton
            type="button"
            :variant="takeProfitKind === 'trailing' ? 'primary' : 'secondary'"
            :aria-pressed="takeProfitKind === 'trailing'"
            @click="takeProfitKind = 'trailing'"
          >
            {{ $t('bots.dca_tp_trailing') }}
          </AppButton>
        </UFieldGroup>
      </div>
      <div class="field-row">
        <UFormField :label="$t('bots.dca_field_take_profit')" :help="$t('bots.dca_hint_take_profit')" :error="fieldErrors.take_profit_percent" class="flex-1">
          <UInput id="dca-take-profit" v-model="values.take_profit_percent" inputmode="decimal" placeholder="1.5" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">%</span></template>
          </UInput>
        </UFormField>
        <UFormField
          v-if="takeProfitKind === 'trailing'"
          :label="$t('bots.dca_field_trailing')"
          :help="$t('bots.dca_hint_trailing')"
          :error="fieldErrors.trailing_take_profit_percent"
          class="flex-1"
        >
          <UInput id="dca-trailing" v-model="values.trailing_take_profit_percent" inputmode="decimal" placeholder="0.5" class="w-full">
            <template #trailing><span class="dca-form__unit" aria-hidden="true">%</span></template>
          </UInput>
        </UFormField>
      </div>
      <p class="dca-form__hint">{{ takeProfitHint }}</p>
    </fieldset>

    <fieldset class="dca-form__group">
      <legend class="dca-form__group-title">{{ $t('bots.dca_group_risk') }}</legend>
      <UCheckbox v-model="stopLossEnabled" :label="$t('bots.dca_field_stop_loss_toggle')" :description="$t('bots.dca_hint_stop_loss')" />
      <UFormField v-if="stopLossEnabled" :label="$t('bots.dca_field_stop_loss')" :error="fieldErrors.stop_loss_percent" class="dca-form__half">
        <UInput id="dca-stop-loss" v-model="values.stop_loss_percent" inputmode="decimal" placeholder="15" class="w-full">
          <template #trailing><span class="dca-form__unit" aria-hidden="true">%</span></template>
        </UInput>
      </UFormField>

      <UCheckbox v-model="autoRestart" :label="$t('bots.dca_field_auto_restart')" :description="$t('bots.dca_hint_auto_restart')" />
      <UFormField v-if="autoRestart" :label="$t('bots.dca_field_restart_delay')" :help="restartDelayHint" :error="fieldErrors.restart_delay_seconds" class="dca-form__half">
        <UInput id="dca-restart-delay" v-model="values.restart_delay_seconds" inputmode="numeric" placeholder="0" class="w-full">
          <template #trailing><span class="dca-form__unit" aria-hidden="true">{{ $t('bots.dca_unit_seconds') }}</span></template>
        </UInput>
      </UFormField>
    </fieldset>

    <section class="dca-preview" :aria-labelledby="`${tpModeTitleId}-preview`">
      <div class="dca-preview__head">
        <h3 :id="`${tpModeTitleId}-preview`" class="dca-preview__title">{{ $t('bots.dca_preview_title') }}</h3>
        <span class="dca-preview__note" :class="{ 'dca-preview__note--warn': spotPrice.status.value === 'not_found' }" aria-live="polite">{{ priceNote }}</span>
      </div>

      <template v-if="ladder.length">
        <dl class="dca-preview__stats">
          <div class="dca-preview__stat dca-preview__stat--accent">
            <dt>{{ $t('bots.dca_max_funds') }}</dt>
            <dd>{{ maxFundsUsdt == null ? '—' : usdt(maxFundsUsdt) }}</dd>
          </div>
          <div class="dca-preview__stat">
            <dt>{{ $t('bots.dca_covers_drop') }}</dt>
            <dd :class="{ 'tone-down': depthError }">{{ formatPercentValue(-deepestDeviation, locale) }}</dd>
            <span v-if="currentPrice != null && !depthError && deepestRow" class="dca-preview__sub">
              {{ $t('bots.dca_down_to', { price: ratioPrice(deepestRow.priceRatio) }) }}
            </span>
          </div>
          <div class="dca-preview__stat">
            <dt>{{ $t('bots.dca_orders_total') }}</dt>
            <dd>{{ ladder.length }}</dd>
            <span class="dca-preview__sub">{{ $t('bots.dca_orders_total_sub', { n: ladder.length - 1 }) }}</span>
          </div>
          <div class="dca-preview__stat">
            <dt>{{ $t('bots.dca_tp_after_all') }}</dt>
            <dd>{{ deepestRow ? ratioPercent(deepestRow.takeProfitRatio) : '—' }}</dd>
            <span class="dca-preview__sub">{{ $t('bots.dca_from_base') }}</span>
          </div>
        </dl>

        <p v-if="depthError" class="dca-form__field-error" role="alert">{{ depthError }}</p>

        <div class="detail-table-wrap">
          <table class="detail-table dca-preview__table">
            <thead>
              <tr>
                <th scope="col">{{ $t('bots.dca_col_order') }}</th>
                <th scope="col" class="num">{{ $t('bots.dca_col_deviation') }}</th>
                <th scope="col" class="num">{{ $t('bots.dca_col_price') }}</th>
                <th scope="col" class="num">{{ $t('bots.dca_col_size') }}</th>
                <th scope="col" class="num">{{ $t('bots.dca_col_total') }}</th>
                <th scope="col" class="num">{{ $t('bots.dca_col_tp') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleLadder" :key="row.index">
                <td>{{ rowTitle(row) }}</td>
                <td class="num" :data-label="$t('bots.dca_col_deviation')">
                  {{ row.index === 0 ? $t('bots.dca_market') : formatPercentValue(-row.deviationPercent, locale) }}
                </td>
                <td class="num" :data-label="$t('bots.dca_col_price')">{{ ratioPrice(row.priceRatio) }}</td>
                <td class="num" :data-label="$t('bots.dca_col_size')">{{ usdt(row.sizeUsdt) }}</td>
                <td class="num" :data-label="$t('bots.dca_col_total')">{{ usdt(row.cumulativeUsdt) }}</td>
                <td class="num" :data-label="$t('bots.dca_col_tp')">
                  <template v-if="currentPrice != null">{{ ratioPrice(row.takeProfitRatio) }}</template>
                  <template v-else>{{ ratioPercent(row.takeProfitRatio) }}</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppButton
          v-if="hiddenRows > 0 || ladderExpanded"
          type="button"
          variant="secondary"
          size="sm"
          class="dca-preview__more"
          :trailing-icon="ladderExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :aria-expanded="ladderExpanded"
          @click="ladderExpanded = !ladderExpanded"
        >
          {{ ladderExpanded ? $t('bots.dca_ladder_collapse') : $t('bots.dca_ladder_show_all', { n: hiddenRows }) }}
        </AppButton>

        <p class="dca-preview__hint">
          {{ currentPrice != null ? $t('bots.dca_preview_hint_price', { coin }) : $t('bots.dca_preview_hint_relative') }}
        </p>
      </template>
      <p v-else class="dca-preview__empty">{{ $t('bots.dca_preview_empty') }}</p>

      <UAlert
        v-for="warning in warnings"
        :key="warning"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="warning"
      />
    </section>
  </BotCreateFormShell>
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dca-form__intro {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.dca-form__notice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  line-height: 1.45;
}

.dca-form__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.dca-form__group-title {
  margin-bottom: 4px;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dca-form__modes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.dca-form__modes-title {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.dca-form__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.dca-form__half {
  width: calc(50% - 8px);
}

.dca-form__unit {
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.dca-form__field-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
  line-height: 1.4;
}

.dca-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.dca-preview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.dca-preview__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.dca-preview__note {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.dca-preview__note--warn {
  color: var(--color-warning);
}

.dca-preview__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.dca-preview__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.dca-preview__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.dca-preview__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.dca-preview__stat--accent {
  border: 1px solid var(--color-accent-dim);
}

.dca-preview__stat--accent dd {
  color: var(--color-accent);
}

.dca-preview__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.dca-preview__more {
  align-self: flex-start;
}

.dca-preview__hint,
.dca-preview__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .dca-form__half {
    width: 100%;
  }

  .dca-preview {
    padding: 14px;
  }

  .dca-preview__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
