<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, GridSpotConfig } from '#shared/types/bot'
import { DCA_TYPICAL_MIN_ORDER_USDT } from '~/utils/dcaSpot'
import { formatCount, formatPercentValue, formatPrice, formatUsdt } from '~/utils/formatNumber'
import {
  buildGridSpotConfig,
  GRID_SPOT_FORM_DEFAULTS,
  GRID_SPOT_LIMITS,
  GRID_SPOT_SERVER_DEFAULTS,
  gridSpotPlan,
} from '~/utils/gridSpot'

const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })

type FieldKey = 'lower_price' | 'upper_price' | 'grid_count' | 'order_usdt' | 'stop_loss_price' | 'take_profit_price'

const SUPPORTED_EXCHANGES: ApiKeyOut['exchange'][] = ['BINANCE', 'OKX']
/** Levels shown in the preview before it collapses to the ends. */
const PREVIEW_LEVELS = 12

const symbol = ref(GRID_SPOT_FORM_DEFAULTS.symbol)
const values = reactive<Record<FieldKey, string>>(defaultValues())
const geometric = ref(GRID_SPOT_SERVER_DEFAULTS.geometric)
const stopLossEnabled = ref(false)
const takeProfitEnabled = ref(false)
/** The range was typed (or cloned): the current price no longer fills it in. */
const rangeTouched = ref(false)
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
const previewTitleId = useId()

function defaultValues(): Record<FieldKey, string> {
  return {
    lower_price: '',
    upper_price: '',
    grid_count: GRID_SPOT_FORM_DEFAULTS.grid_count,
    order_usdt: GRID_SPOT_FORM_DEFAULTS.order_usdt,
    stop_loss_price: '',
    take_profit_price: '',
  }
}

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

// --- Price ---

const symbolValue = computed(() => symbol.value.trim().toUpperCase().replace(/[\s/_-]/g, ''))

const symbolError = computed(() => {
  const value = symbolValue.value
  if (!value) return null
  return /^[A-Z0-9]+USDT$/.test(value) && value.length <= 64 ? null : t('bots.dca_error_symbol')
})

const priceQuery = computed(() => (symbolError.value || !symbolValue.value
  ? null
  : { exchange: selectedKey.value?.exchange ?? 'BINANCE', symbol: symbolValue.value }))
const spotPrice = useSpotPrice(priceQuery)
const currentPrice = computed(() => spotPrice.data.value?.price ?? null)

/** A plain-looking price: 4 significant digits. */
function roundPrice(value: number): string {
  return String(Number(value.toPrecision(4)))
}

function fillRangeFromPrice() {
  const price = currentPrice.value
  if (price == null || price <= 0) return
  const pct = GRID_SPOT_FORM_DEFAULTS.range_percent / 100
  values.lower_price = roundPrice(price * (1 - pct))
  values.upper_price = roundPrice(price * (1 + pct))
}

watch(currentPrice, () => {
  if (!rangeTouched.value) fillRangeFromPrice()
}, { immediate: true })

watch(symbolValue, () => {
  rangeTouched.value = false
})

function touchRange() {
  rangeTouched.value = true
}

function resetRange() {
  rangeTouched.value = false
  fillRangeFromPrice()
}

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

// --- Field validation (mirrors GridSpotConfig on the server) ---

const LABELS: Record<FieldKey, string> = {
  lower_price: 'bots.grid_spot_field_lower',
  upper_price: 'bots.grid_spot_field_upper',
  grid_count: 'bots.grid_spot_field_count',
  order_usdt: 'bots.grid_spot_field_order',
  stop_loss_price: 'bots.grid_spot_field_stop_loss',
  take_profit_price: 'bots.grid_spot_field_take_profit',
}

const activeFields = computed<FieldKey[]>(() => {
  const keys: FieldKey[] = ['lower_price', 'upper_price', 'grid_count', 'order_usdt']
  if (stopLossEnabled.value) keys.push('stop_loss_price')
  if (takeProfitEnabled.value) keys.push('take_profit_price')
  return keys
})

function basicError(key: FieldKey): string | null {
  const field = t(LABELS[key])
  const raw = normalized(values[key])
  if (!raw) return submitted.value ? t('bots.dca_error_required', { field }) : null
  const value = Number(raw)
  if (!Number.isFinite(value)) return t('bots.dca_error_number', { field })
  if (key === 'grid_count') {
    if (!Number.isInteger(value)) return t('bots.dca_error_integer', { field })
    if (value < GRID_SPOT_LIMITS.grid_count_min || value > GRID_SPOT_LIMITS.grid_count_max) {
      return t('bots.dca_error_range', { field, min: GRID_SPOT_LIMITS.grid_count_min, max: GRID_SPOT_LIMITS.grid_count_max })
    }
    return null
  }
  if (value <= 0) return t('bots.dca_error_positive', { field })
  if (key === 'order_usdt' && value > GRID_SPOT_LIMITS.order_usdt_max) {
    return t('bots.dca_error_range', { field, min: 0, max: formatPrice(GRID_SPOT_LIMITS.order_usdt_max, locale.value) })
  }
  return null
}

const fieldErrors = computed<Partial<Record<FieldKey, string>>>(() => {
  const result: Partial<Record<FieldKey, string>> = {}
  for (const key of activeFields.value) {
    const error = basicError(key)
    if (error) result[key] = error
  }
  const lower = parsed('lower_price')
  const upper = parsed('upper_price')
  if (!result.upper_price && lower != null && upper != null && upper <= lower) {
    result.upper_price = t('bots.grid_spot_error_upper_below_lower')
  }
  const sl = parsed('stop_loss_price')
  if (stopLossEnabled.value && !result.stop_loss_price && sl != null && lower != null && sl >= lower) {
    result.stop_loss_price = t('bots.grid_spot_error_stop_loss')
  }
  const tp = parsed('take_profit_price')
  if (takeProfitEnabled.value && !result.take_profit_price && tp != null && upper != null && tp <= upper) {
    result.take_profit_price = t('bots.grid_spot_error_take_profit')
  }
  return result
})

// --- Preview ---

const plan = computed(() => {
  const errors = fieldErrors.value
  if (errors.lower_price || errors.upper_price || errors.grid_count || errors.order_usdt) return null
  const lower = parsed('lower_price')
  const upper = parsed('upper_price')
  const count = parsed('grid_count')
  const orderUsdt = parsed('order_usdt')
  if (lower == null || upper == null || count == null || orderUsdt == null) return null
  return gridSpotPlan({ lower, upper, count, geometric: geometric.value, orderUsdt, price: currentPrice.value })
})

const stepTooSmall = computed(() => plan.value?.minStepPercent != null && plan.value.minStepPercent < GRID_SPOT_LIMITS.min_step_percent)

const priceOutOfRange = computed(() => {
  const price = currentPrice.value
  const lower = parsed('lower_price')
  const upper = parsed('upper_price')
  if (price == null || lower == null || upper == null || upper <= lower) return false
  return price < lower || price > upper
})

interface PreviewLevel {
  key: string
  price: string
  side: 'buy' | 'sell' | 'gap'
}

const previewLevels = computed<PreviewLevel[]>(() => {
  const levels = plan.value?.levels ?? []
  const price = currentPrice.value
  const rows: PreviewLevel[] = levels.map((level, k) => ({
    key: String(k),
    price: formatPrice(level, locale.value),
    // a level above the price is a sell target, below it a buy
    side: price != null && level > price ? 'sell' : 'buy',
  }))
  rows.reverse()
  if (rows.length <= PREVIEW_LEVELS) return rows
  const half = PREVIEW_LEVELS / 2
  return [
    ...rows.slice(0, half),
    { key: 'gap', price: t('bots.grid_spot_preview_more', { n: formatCount(rows.length - PREVIEW_LEVELS, locale.value) }), side: 'gap' },
    ...rows.slice(-half),
  ]
})

function usdt(value: number): string {
  return `${formatUsdt(value, locale.value)}\u00A0USDT`
}

const warnings = computed<string[]>(() => {
  const result: string[] = []
  const orderUsdt = parsed('order_usdt')
  if (orderUsdt != null && !fieldErrors.value.order_usdt && orderUsdt < DCA_TYPICAL_MIN_ORDER_USDT) {
    result.push(t('bots.dca_warning_small_order', { min: DCA_TYPICAL_MIN_ORDER_USDT }))
  }
  if (priceOutOfRange.value) result.push(t('bots.grid_spot_warning_out_of_range'))
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
  if (stepTooSmall.value) {
    formError.value = t('bots.grid_spot_error_step', { min: GRID_SPOT_LIMITS.min_step_percent })
    return false
  }
  return true
}

function buildConfig(): GridSpotConfig {
  return buildGridSpotConfig({
    symbol: symbolValue.value,
    lowerPrice: normalized(values.lower_price),
    upperPrice: normalized(values.upper_price),
    gridCount: Math.trunc(parsed('grid_count') ?? GRID_SPOT_SERVER_DEFAULTS.grid_count),
    orderUsdt: normalized(values.order_usdt),
    geometric: geometric.value,
    stopLossPrice: stopLossEnabled.value ? normalized(values.stop_loss_price) : null,
    takeProfitPrice: takeProfitEnabled.value ? normalized(values.take_profit_price) : null,
  })
}

async function handleSubmit() {
  resetSubmitState()
  submitted.value = true
  if (!validate()) return

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'GRID_SPOT',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'GRID_SPOT') return false

  const keyExists = keys.some((key) => key.id === payload.api_key_id && SUPPORTED_EXCHANGES.includes(key.exchange))
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as GridSpotConfig
  const text = (value: unknown, fallback = '') => (value == null || value === '' ? fallback : String(value))
  symbol.value = config.symbol
  // after the symbol watcher, so the cloned range is kept
  nextTick(() => {
    rangeTouched.value = true
    Object.assign(values, {
      lower_price: text(config.lower_price),
      upper_price: text(config.upper_price),
      grid_count: text(config.grid_count, String(GRID_SPOT_SERVER_DEFAULTS.grid_count)),
      order_usdt: text(config.order_usdt),
      stop_loss_price: text(config.stop_loss_price),
      take_profit_price: text(config.take_profit_price),
    } satisfies Record<FieldKey, string>)
  })
  geometric.value = config.geometric === true
  stopLossEnabled.value = config.stop_loss_price != null && Number(config.stop_loss_price) > 0
  takeProfitEnabled.value = config.take_profit_price != null && Number(config.take_profit_price) > 0
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
    <p v-if="symbolError" class="gs-form__field-error" role="alert">{{ symbolError }}</p>
    <UAlert
      v-if="!spotKeys.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-key-round"
      :title="$t('bots.dca_no_spot_keys')"
    />

    <p class="gs-form__intro">{{ $t('bots.grid_spot_form_intro') }}</p>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('bots.dca_notice_title')"
    >
      <template #description>
        <ul class="gs-form__notice-list">
          <li>{{ $t('bots.dca_notice_permission') }}</li>
          <li>{{ $t('bots.grid_spot_notice_start') }}</li>
          <li>{{ $t('bots.grid_spot_notice_own_orders') }}</li>
        </ul>
      </template>
    </UAlert>

    <fieldset class="gs-form__group">
      <legend class="gs-form__group-title">{{ $t('bots.grid_spot_group_range') }}</legend>
      <div class="field-row">
        <UFormField :label="$t('bots.grid_spot_field_lower')" :error="fieldErrors.lower_price" class="flex-1">
          <UInput id="gs-lower" v-model="values.lower_price" inputmode="decimal" class="w-full" @update:model-value="touchRange">
            <template #trailing><span class="gs-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('bots.grid_spot_field_upper')" :error="fieldErrors.upper_price" class="flex-1">
          <UInput id="gs-upper" v-model="values.upper_price" inputmode="decimal" class="w-full" @update:model-value="touchRange">
            <template #trailing><span class="gs-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
      </div>
      <div class="gs-form__presets">
        <span class="gs-form__presets-title">{{ $t('bots.grid_spot_range_hint', { n: GRID_SPOT_FORM_DEFAULTS.range_percent }) }}</span>
        <AppButton type="button" size="sm" variant="secondary" :disabled="currentPrice == null" @click="resetRange">
          {{ $t('bots.grid_spot_range_from_price') }}
        </AppButton>
      </div>
      <div class="field-row">
        <UFormField :label="$t('bots.grid_spot_field_count')" :help="$t('bots.grid_spot_hint_count')" :error="fieldErrors.grid_count" class="flex-1">
          <UInput id="gs-count" v-model="values.grid_count" inputmode="numeric" placeholder="20" class="w-full" />
        </UFormField>
        <UFormField :label="$t('bots.grid_spot_field_order')" :help="$t('bots.grid_spot_hint_order')" :error="fieldErrors.order_usdt" class="flex-1">
          <UInput id="gs-order" v-model="values.order_usdt" inputmode="decimal" placeholder="10" class="w-full">
            <template #trailing><span class="gs-form__unit" aria-hidden="true">USDT</span></template>
          </UInput>
        </UFormField>
      </div>
      <UCheckbox v-model="geometric" :label="$t('bots.grid_spot_field_geometric')" :description="$t('bots.grid_spot_hint_geometric')" />
    </fieldset>

    <fieldset class="gs-form__group">
      <legend class="gs-form__group-title">{{ $t('bots.grid_spot_group_exits') }}</legend>
      <UCheckbox v-model="stopLossEnabled" :label="$t('bots.grid_spot_field_stop_loss_toggle')" :description="$t('bots.grid_spot_hint_stop_loss')" />
      <UFormField v-if="stopLossEnabled" :label="$t('bots.grid_spot_field_stop_loss')" :error="fieldErrors.stop_loss_price" class="gs-form__half">
        <UInput id="gs-sl" v-model="values.stop_loss_price" inputmode="decimal" class="w-full">
          <template #trailing><span class="gs-form__unit" aria-hidden="true">USDT</span></template>
        </UInput>
      </UFormField>
      <UCheckbox v-model="takeProfitEnabled" :label="$t('bots.grid_spot_field_take_profit_toggle')" :description="$t('bots.grid_spot_hint_take_profit')" />
      <UFormField v-if="takeProfitEnabled" :label="$t('bots.grid_spot_field_take_profit')" :error="fieldErrors.take_profit_price" class="gs-form__half">
        <UInput id="gs-tp" v-model="values.take_profit_price" inputmode="decimal" class="w-full">
          <template #trailing><span class="gs-form__unit" aria-hidden="true">USDT</span></template>
        </UInput>
      </UFormField>
    </fieldset>

    <section class="gs-preview" :aria-labelledby="previewTitleId">
      <div class="gs-preview__head">
        <h3 :id="previewTitleId" class="gs-preview__title">{{ $t('bots.grid_spot_preview_title') }}</h3>
        <span class="gs-preview__note" aria-live="polite">{{ priceNote }}</span>
      </div>
      <template v-if="plan">
        <dl class="gs-preview__stats">
          <div class="gs-preview__stat gs-preview__stat--accent">
            <dt>{{ $t('bots.grid_spot_preview_funds') }}</dt>
            <dd>{{ usdt(plan.fundsUsdt) }}</dd>
            <span class="gs-preview__sub">{{ $t('bots.grid_spot_preview_cells', { buy: plan.buyingCells, sell: plan.sellingCells }) }}</span>
          </div>
          <div class="gs-preview__stat">
            <dt>{{ $t('bots.grid_spot_preview_step') }}</dt>
            <dd :class="{ 'tone-down': stepTooSmall }">
              {{ plan.minStepPercent == null ? '—' : formatPercentValue(plan.minStepPercent, locale) }}<template v-if="plan.maxStepPercent != null && plan.minStepPercent != null && plan.maxStepPercent - plan.minStepPercent > 0.005"> – {{ formatPercentValue(plan.maxStepPercent, locale) }}</template>
            </dd>
          </div>
          <div class="gs-preview__stat">
            <dt>{{ $t('bots.grid_spot_preview_profit') }}</dt>
            <dd>{{ usdt(plan.minProfitUsdt) }}<template v-if="plan.maxProfitUsdt - plan.minProfitUsdt > 0.005"> – {{ usdt(plan.maxProfitUsdt) }}</template></dd>
            <span class="gs-preview__sub">{{ $t('bots.grid_spot_preview_profit_hint') }}</span>
          </div>
          <div class="gs-preview__stat">
            <dt>{{ $t('bots.grid_spot_preview_levels') }}</dt>
            <dd>{{ formatCount(plan.levels.length, locale) }}</dd>
          </div>
        </dl>
        <ol class="gs-preview__levels" :aria-label="$t('bots.grid_spot_preview_levels')">
          <li v-for="level in previewLevels" :key="level.key" class="gs-preview__level" :class="`gs-preview__level--${level.side}`">
            <span>{{ level.price }}</span>
            <span v-if="level.side !== 'gap'" class="gs-preview__level-side">
              {{ level.side === 'sell' ? $t('bots.grid_spot_side_sell') : $t('bots.grid_spot_side_buy') }}
            </span>
          </li>
        </ol>
      </template>
      <p v-else class="gs-preview__hint">{{ $t('bots.grid_spot_preview_empty') }}</p>
      <p class="gs-preview__hint">{{ $t('bots.grid_spot_preview_hint') }}</p>

      <UAlert v-if="stepTooSmall" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="$t('bots.grid_spot_error_step', { min: GRID_SPOT_LIMITS.min_step_percent })" />
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

.gs-form__intro {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.gs-form__notice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  line-height: 1.45;
}

.gs-form__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.gs-form__group-title {
  margin-bottom: 4px;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.gs-form__presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.gs-form__presets-title {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.gs-form__half {
  width: calc(50% - 8px);
}

.gs-form__unit {
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.gs-form__field-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
  line-height: 1.4;
}

.gs-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.gs-preview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.gs-preview__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.gs-preview__note {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.gs-preview__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.gs-preview__stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
}

.gs-preview__stat dt {
  color: var(--color-text-muted);
  font-size: 12px;
}

.gs-preview__stat dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.gs-preview__stat--accent {
  border: 1px solid var(--color-accent-dim);
}

.gs-preview__stat--accent dd {
  color: var(--color-accent);
}

.gs-preview__sub {
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.gs-preview__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.gs-preview__levels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.gs-preview__level {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 10px;
  border-left: 3px solid transparent;
  border-radius: 6px;
  background: rgb(255 255 255 / 3%);
}

.gs-preview__level--sell {
  border-left-color: var(--color-down);
}

.gs-preview__level--buy {
  border-left-color: var(--color-up);
}

.gs-preview__level--gap {
  justify-content: center;
  color: var(--color-text-muted);
  background: none;
}

.gs-preview__level-side {
  color: var(--color-text-muted);
}

.tone-down {
  color: var(--color-down);
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .gs-form__half {
    width: 100%;
  }

  .gs-preview {
    padding: 14px;
  }

  .gs-preview__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
