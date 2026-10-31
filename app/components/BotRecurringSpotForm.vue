<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, RecurringSpotConfig } from '#shared/types/bot'
import { DCA_TYPICAL_MIN_ORDER_USDT } from '~/utils/dcaSpot'
import { formatCount, formatPrice, formatQuantity, formatUsdt } from '~/utils/formatNumber'
import { baseCoinFromSymbol } from '~/utils/orderSize'
import {
  buildRecurringConfig,
  RECURRING_FORM_DEFAULTS,
  RECURRING_INTERVAL_PRESETS,
  RECURRING_LIMITS,
  RECURRING_SERVER_DEFAULTS,
  recurringIntervalLabel,
  recurringPlan,
} from '~/utils/recurringSpot'

const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })

type FieldKey = 'amount_usdt' | 'interval_hours' | 'dip_ma_period' | 'dip_multiplier' | 'max_total_usdt'

const SUPPORTED_EXCHANGES: ApiKeyOut['exchange'][] = ['BINANCE', 'OKX']

const symbol = ref(RECURRING_FORM_DEFAULTS.symbol)
const values = reactive<Record<FieldKey, string>>(defaultValues())
const dipEnabled = ref(true)
const budgetEnabled = ref(true)
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
const intervalTitleId = useId()

function defaultValues(): Record<FieldKey, string> {
  return {
    amount_usdt: RECURRING_FORM_DEFAULTS.amount_usdt,
    interval_hours: RECURRING_FORM_DEFAULTS.interval_hours,
    dip_ma_period: RECURRING_FORM_DEFAULTS.dip_ma_period,
    dip_multiplier: RECURRING_FORM_DEFAULTS.dip_multiplier,
    max_total_usdt: RECURRING_FORM_DEFAULTS.max_total_usdt,
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

// --- API keys: Binance and OKX only ---

const spotKeys = computed(() => props.apiKeys.filter((key) => SUPPORTED_EXCHANGES.includes(key.exchange)))
const selectedKey = computed(() => props.apiKeys.find((key) => key.id === apiKeyId.value))

watch(() => [apiKeyId.value, spotKeys.value.length] as const, ([id]) => {
  if (id === '') {
    const onlyKey = spotKeys.value.length === 1 ? spotKeys.value[0] : undefined
    if (onlyKey) apiKeyId.value = onlyKey.id
    return
  }
  if (selectedKey.value && !SUPPORTED_EXCHANGES.includes(selectedKey.value.exchange)) apiKeyId.value = ''
}, { immediate: true })

// --- Field validation (mirrors RecurringSpotConfig on the server) ---

interface FieldRule {
  labelKey: string
  integer?: boolean
  min: number
  minExclusive?: boolean
  max: number
}

const RULES: Record<FieldKey, FieldRule> = {
  amount_usdt: { labelKey: 'bots.recurring_field_amount', min: 0, minExclusive: true, max: RECURRING_LIMITS.amount_usdt_max },
  interval_hours: {
    labelKey: 'bots.recurring_field_interval',
    integer: true,
    min: RECURRING_LIMITS.interval_hours_min,
    max: RECURRING_LIMITS.interval_hours_max,
  },
  dip_ma_period: {
    labelKey: 'bots.recurring_field_ma_period',
    integer: true,
    min: RECURRING_LIMITS.dip_ma_period_min,
    max: RECURRING_LIMITS.dip_ma_period_max,
  },
  dip_multiplier: {
    labelKey: 'bots.recurring_field_multiplier',
    min: RECURRING_LIMITS.dip_multiplier_min,
    max: RECURRING_LIMITS.dip_multiplier_max,
  },
  max_total_usdt: { labelKey: 'bots.recurring_field_budget', min: 0, minExclusive: true, max: RECURRING_LIMITS.max_total_usdt_max },
}

const activeFields = computed<FieldKey[]>(() => {
  const keys: FieldKey[] = ['amount_usdt', 'interval_hours']
  if (dipEnabled.value) keys.push('dip_ma_period', 'dip_multiplier')
  if (budgetEnabled.value) keys.push('max_total_usdt')
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
  if (!belowMin && value <= rule.max) return null
  if (rule.min === 0 && rule.minExclusive && belowMin) return t('bots.dca_error_positive', { field })
  return t('bots.dca_error_range', { field, min: formatLimit(rule.min), max: formatLimit(rule.max) })
}

const fieldErrors = computed<Partial<Record<FieldKey, string>>>(() => {
  const result: Partial<Record<FieldKey, string>> = {}
  for (const key of activeFields.value) {
    const error = ruleError(key)
    if (error) result[key] = error
  }
  // The budget must cover at least one buy (server rule)
  const amount = parsed('amount_usdt')
  const budget = parsed('max_total_usdt')
  if (budgetEnabled.value && !result.max_total_usdt && amount != null && budget != null && budget < amount) {
    result.max_total_usdt = t('bots.recurring_error_budget_below_amount')
  }
  return result
})

const symbolValue = computed(() => symbol.value.trim().toUpperCase().replace(/[\s/_-]/g, ''))

const symbolError = computed(() => {
  const value = symbolValue.value
  if (!value) return null
  return /^[A-Z0-9]+USDT$/.test(value) && value.length <= 64 ? null : t('bots.dca_error_symbol')
})

const intervalHours = computed(() => (fieldErrors.value.interval_hours ? null : parsed('interval_hours')))

function pickInterval(hours: number) {
  values.interval_hours = String(hours)
}

// --- Preview ---

const plan = computed(() => {
  const amount = fieldErrors.value.amount_usdt ? null : parsed('amount_usdt')
  if (amount == null || intervalHours.value == null) return null
  return recurringPlan({
    amountUsdt: amount,
    intervalHours: intervalHours.value,
    dipMultiplier: dipEnabled.value && !fieldErrors.value.dip_multiplier ? parsed('dip_multiplier') : null,
    maxTotalUsdt: budgetEnabled.value && !fieldErrors.value.max_total_usdt ? parsed('max_total_usdt') : null,
  })
})

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

const coinsPerBuy = computed(() => {
  const amount = parsed('amount_usdt')
  if (amount == null || currentPrice.value == null || currentPrice.value <= 0) return null
  return amount / currentPrice.value
})

function usdt(value: number): string {
  return `${formatUsdt(value, locale.value)}\u00A0USDT`
}

const warnings = computed<string[]>(() => {
  const result: string[] = []
  const amount = parsed('amount_usdt')
  if (amount != null && !fieldErrors.value.amount_usdt && amount < DCA_TYPICAL_MIN_ORDER_USDT) {
    result.push(t('bots.dca_warning_small_order', { min: DCA_TYPICAL_MIN_ORDER_USDT }))
  }
  return result
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
  return true
}

function buildConfig(): RecurringSpotConfig {
  const integer = (key: FieldKey, fallback: number) => {
    const value = parsed(key)
    return value == null ? fallback : Math.trunc(value)
  }
  return buildRecurringConfig({
    symbol: symbolValue.value,
    amountUsdt: normalized(values.amount_usdt),
    intervalHours: integer('interval_hours', RECURRING_SERVER_DEFAULTS.interval_hours),
    dipMaPeriod: dipEnabled.value ? integer('dip_ma_period', 20) : null,
    dipMultiplier: dipEnabled.value ? normalized(values.dip_multiplier) : String(RECURRING_SERVER_DEFAULTS.dip_multiplier),
    maxTotalUsdt: budgetEnabled.value ? normalized(values.max_total_usdt) : null,
  })
}

async function handleSubmit() {
  resetSubmitState()
  submitted.value = true
  if (!validate()) return

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'RECURRING_SPOT',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'RECURRING_SPOT') return false

  const keyExists = keys.some((key) => key.id === payload.api_key_id && SUPPORTED_EXCHANGES.includes(key.exchange))
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as RecurringSpotConfig
  const text = (value: unknown, fallback: string) => (value == null || value === '' ? fallback : String(value))
  symbol.value = config.symbol
  const period = config.dip_ma_period
  const budget = config.max_total_usdt
  Object.assign(values, {
    amount_usdt: text(config.amount_usdt, ''),
    interval_hours: text(config.interval_hours, String(RECURRING_SERVER_DEFAULTS.interval_hours)),
    dip_ma_period: text(period, RECURRING_FORM_DEFAULTS.dip_ma_period),
    dip_multiplier: text(config.dip_multiplier, String(RECURRING_SERVER_DEFAULTS.dip_multiplier)),
    max_total_usdt: text(budget, RECURRING_FORM_DEFAULTS.max_total_usdt),
  } satisfies Record<FieldKey, string>)
  dipEnabled.value = period != null && Number(period) > 0
  budgetEnabled.value = budget != null && Number(budget) > 0
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
    <p v-if="symbolError" class="rec-form__field-error" role="alert">{{ symbolError }}</p>
    <UAlert
      v-if="!spotKeys.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-key-round"
      :title="$t('bots.dca_no_spot_keys')"
    />

    <p class="rec-form__intro">{{ $t('bots.recurring_form_intro') }}</p>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('bots.dca_notice_title')"
    >
      <template #description>
        <ul class="rec-form__notice-list">
          <li>{{ $t('bots.dca_notice_permission') }}</li>
          <li>{{ $t('bots.recurring_notice_no_sell') }}</li>
          <li>{{ $t('bots.recurring_notice_balance') }}</li>
        </ul>
      </template>
    </UAlert>

    <fieldset class="rec-form__group">
      <legend class="rec-form__group-title">{{ $t('bots.recurring_group_schedule') }}</legend>
      <div class="field-row">
        <UFormField :label="$t('bots.recurring_field_amount')" :help="$t('bots.recurring_hint_amount')" :error="fieldErrors.amount_usdt" class="flex-1">
          <UInput id="rec-amount" v-model="values.amount_usdt" inputmode="decimal" placeholder="10" class="w-full">
            <template #trailing><span class="rec-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('bots.recurring_field_interval')" :help="recurringIntervalLabel(t, intervalHours)" :error="fieldErrors.interval_hours" class="flex-1">
          <UInput id="rec-interval" v-model="values.interval_hours" inputmode="numeric" placeholder="24" class="w-full">
            <template #trailing><span class="rec-form__unit" aria-hidden="true">{{ $t('bots.recurring_unit_hours') }}</span></template>
          </UInput>
        </UFormField>
      </div>
      <div class="rec-form__presets" role="group" :aria-labelledby="intervalTitleId">
        <span :id="intervalTitleId" class="rec-form__presets-title">{{ $t('bots.recurring_interval_presets') }}</span>
        <AppButton
          v-for="preset in RECURRING_INTERVAL_PRESETS"
          :key="preset.hours"
          type="button"
          size="sm"
          :variant="intervalHours === preset.hours ? 'primary' : 'secondary'"
          :aria-pressed="intervalHours === preset.hours"
          @click="pickInterval(preset.hours)"
        >
          {{ $t(preset.key) }}
        </AppButton>
      </div>
    </fieldset>

    <fieldset class="rec-form__group">
      <legend class="rec-form__group-title">{{ $t('bots.recurring_group_dip') }}</legend>
      <UCheckbox v-model="dipEnabled" :label="$t('bots.recurring_field_dip_toggle')" :description="$t('bots.recurring_hint_dip')" />
      <div v-if="dipEnabled" class="field-row">
        <UFormField :label="$t('bots.recurring_field_ma_period')" :help="$t('bots.recurring_hint_ma_period')" :error="fieldErrors.dip_ma_period" class="flex-1">
          <UInput id="rec-ma" v-model="values.dip_ma_period" inputmode="numeric" placeholder="20" class="w-full">
            <template #trailing><span class="rec-form__unit" aria-hidden="true">{{ $t('bots.recurring_unit_days') }}</span></template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('bots.recurring_field_multiplier')" :help="$t('bots.recurring_hint_multiplier')" :error="fieldErrors.dip_multiplier" class="flex-1">
          <UInput id="rec-mult" v-model="values.dip_multiplier" inputmode="decimal" placeholder="2" class="w-full">
            <template #trailing><span class="rec-form__unit" aria-hidden="true">×</span></template>
          </UInput>
        </UFormField>
      </div>
    </fieldset>

    <fieldset class="rec-form__group">
      <legend class="rec-form__group-title">{{ $t('bots.recurring_group_budget') }}</legend>
      <UCheckbox v-model="budgetEnabled" :label="$t('bots.recurring_field_budget_toggle')" :description="$t('bots.recurring_hint_budget')" />
      <UFormField v-if="budgetEnabled" :label="$t('bots.recurring_field_budget')" :error="fieldErrors.max_total_usdt" class="rec-form__half">
        <UInput id="rec-budget" v-model="values.max_total_usdt" inputmode="decimal" placeholder="1000" class="w-full">
          <template #trailing><span class="rec-form__unit" aria-hidden="true">USDT</span></template>
        </UInput>
      </UFormField>
    </fieldset>

    <section class="rec-preview" :aria-labelledby="`${intervalTitleId}-preview`">
      <div class="rec-preview__head">
        <h3 :id="`${intervalTitleId}-preview`" class="rec-preview__title">{{ $t('bots.recurring_preview_title') }}</h3>
        <span class="rec-preview__note" aria-live="polite">{{ priceNote }}</span>
      </div>
      <dl v-if="plan" class="rec-preview__stats">
        <div class="rec-preview__stat rec-preview__stat--accent">
          <dt>{{ $t('bots.recurring_per_month') }}</dt>
          <dd>{{ usdt(plan.usdtPerMonth) }}</dd>
          <span v-if="dipEnabled && plan.usdtPerMonthMax > plan.usdtPerMonth" class="rec-preview__sub">
            {{ $t('bots.recurring_per_month_max', { value: usdt(plan.usdtPerMonthMax) }) }}
          </span>
        </div>
        <div class="rec-preview__stat">
          <dt>{{ $t('bots.recurring_buys_per_month') }}</dt>
          <dd>{{ formatPrice(plan.buysPerMonth, locale, plan.buysPerMonth % 1 ? 1 : 0) }}</dd>
        </div>
        <div class="rec-preview__stat">
          <dt>{{ $t('bots.recurring_coins_per_buy') }}</dt>
          <dd>{{ coinsPerBuy == null ? '—' : `${formatQuantity(coinsPerBuy, locale)} ${coin}` }}</dd>
        </div>
        <div class="rec-preview__stat">
          <dt>{{ $t('bots.recurring_budget_lasts') }}</dt>
          <dd>{{ plan.daysToBudget == null ? $t('bots.recurring_no_limit') : $t('bots.recurring_days', { n: formatCount(Math.ceil(plan.daysToBudget), locale) }) }}</dd>
          <span v-if="plan.buysToBudget != null" class="rec-preview__sub">{{ $t('bots.recurring_buys_n', { n: formatCount(plan.buysToBudget, locale) }) }}</span>
        </div>
      </dl>
      <p v-else class="rec-preview__hint">{{ $t('bots.recurring_preview_empty') }}</p>
      <p class="rec-preview__hint">{{ $t('bots.recurring_preview_hint') }}</p>

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

.rec-form__intro {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.rec-form__notice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  line-height: 1.45;
}

.rec-form__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.rec-form__group-title {
  margin-bottom: 4px;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rec-form__presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.rec-form__presets-title {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.rec-form__half {
  width: calc(50% - 8px);
}

.rec-form__unit {
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.rec-form__field-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
  line-height: 1.4;
}

.rec-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.rec-preview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.rec-preview__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.rec-preview__note {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.rec-preview__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.rec-preview__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.rec-preview__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.rec-preview__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.rec-preview__stat--accent {
  border: 1px solid var(--color-accent-dim);
}

.rec-preview__stat--accent dd {
  color: var(--color-accent);
}

.rec-preview__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.rec-preview__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .rec-form__half {
    width: 100%;
  }

  .rec-preview {
    padding: 14px;
  }

  .rec-preview__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
