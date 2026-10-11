<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import { StopLossMode, TakeProfitMode, type BotCreate, type GridDirection, type GridFuturesConfig, type GridSizingMode, type OrderSizeMode, type VolumeMode } from '#shared/types/bot'
import {
  buildMixedGridPayload,
  defaultMixedGridForm,
  isMixedConfig,
  parseMixedGrid,
  validateMixedGrid,
  type MixedGridForm,
} from '~/utils/mixedGrid'
import {
  buildOrderSizePayload,
  isOrderSizeApiError,
  parseOrderSize,
  parseOrderSizeApiError,
  validateOrderSize,
} from '~/utils/orderSize'
import { getApiErrorStatus, parseApiError } from '~/utils/parseApiError'
import {
  buildStopLossPayload,
  isStopLossApiError,
  parseStopLoss,
  validateStopLoss,
} from '~/utils/stopLoss'
import {
  buildTakeProfitPayload,
  isTakeProfitApiError,
  parseTakeProfit,
  validateTakeProfit,
} from '~/utils/takeProfit'

defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })
const symbol = defineModel<string>('symbol', { required: true })
const direction = defineModel<GridDirection>('direction', { required: true })
const orderSizeMode = defineModel<OrderSizeMode>('orderSizeMode', { required: true })
const orderSizeValue = defineModel<string>('orderSizeValue', { required: true })
const gridOrdersCount = defineModel<number>('gridOrdersCount', { required: true })
const gridStepPercent = defineModel<string>('gridStepPercent', { required: true })
const volumeMode = defineModel<VolumeMode>('volumeMode', { required: true })
const startPrice = defineModel<string>('startPrice', { required: true })
const autoRestart = defineModel<boolean>('autoRestart', { required: true })
const takeProfitMode = defineModel<TakeProfitMode>('takeProfitMode', { required: true })
const takeProfitValue = defineModel<string>('takeProfitValue', { required: true })
const stopLossMode = defineModel<StopLossMode>('stopLossMode', { required: true })
const stopLossValue = defineModel<string>('stopLossValue', { required: true })
const sizingMode = defineModel<GridSizingMode>('sizingMode', { required: true })
const mixedGrid = defineModel<MixedGridForm>('mixedGrid', { required: true })

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
const orderSizeRef = ref<{ reveal: () => void } | null>(null)
const mixedGridRef = ref<{ reveal: () => void } | null>(null)
const mixedGridError = ref('')
const orderSizeError = ref('')
const takeProfitError = ref('')
const stopLossError = ref('')

const sizingModeTitleId = useId()
const sizingModeOptions = computed<{ value: GridSizingMode, label: string }[]>(() => [
  { value: 'legacy', label: t('bots.sizing_mode_legacy') },
  { value: 'mixed', label: t('bots.sizing_mode_mixed') },
])

const isMixed = computed(() => sizingMode.value === 'mixed')

function buildGridConfig(): GridFuturesConfig {
  const startPriceValue = startPrice.value.trim()
  const takeProfit = buildTakeProfitPayload(takeProfitMode.value, takeProfitValue.value)
  const stopLoss = buildStopLossPayload(stopLossMode.value, stopLossValue.value)
  const common = {
    symbol: symbol.value.trim().toUpperCase(),
    direction: direction.value,
    grid_step_percent: gridStepPercent.value.trim(),
    auto_restart: autoRestart.value,
    take_profit_percent: takeProfit.take_profit_percent,
    take_profit_amount: takeProfit.take_profit_amount,
    stop_loss_percent: stopLoss.stop_loss_percent,
    ...(startPriceValue ? { start_price: startPriceValue } : {}),
  }

  if (isMixed.value) {
    // Every order sized on its own; order #1 is the market entry, so the grid has orders − 1 levels
    return {
      ...common,
      initial_amount: null,
      initial_amount_usdt: null,
      initial_amount_percent: null,
      grid_orders_count: Math.max(mixedGrid.value.orders.length - 1, 1),
      volume_mode: 'fixed',
      sizing_mode: 'mixed',
      mixed_grid: buildMixedGridPayload(mixedGrid.value),
    }
  }

  const orderSize = buildOrderSizePayload(orderSizeMode.value, orderSizeValue.value)
  return {
    ...common,
    initial_amount: orderSize.initial_amount,
    initial_amount_usdt: orderSize.initial_amount_usdt,
    initial_amount_percent: orderSize.initial_amount_percent,
    grid_orders_count: gridOrdersCount.value,
    volume_mode: volumeMode.value,
    sizing_mode: 'legacy',
    mixed_grid: null,
  }
}

/** The size block sits far above the submit button, so bring it into view with the message. */
function showOrderSizeError(message: string) {
  orderSizeError.value = message
  orderSizeRef.value?.reveal()
}

function showMixedGridError(message: string) {
  mixedGridError.value = message
  mixedGridRef.value?.reveal()
}

/** 400 from the exchange check (order numbers below the minimum) or 422 about `mixed_grid`. */
function isMixedGridApiError(error: unknown): boolean {
  const status = getApiErrorStatus(error)
  const detail = JSON.stringify((error as { data?: { detail?: unknown } } | null)?.data?.detail ?? '')
  if (status === 400) return detail.includes('ордер №')
  return status === 422 && detail.includes('mixed_grid')
}

function clearFieldErrors() {
  orderSizeError.value = ''
  mixedGridError.value = ''
  takeProfitError.value = ''
  stopLossError.value = ''
}

function validate(): boolean {
  if (!validateBase(apiKeyId.value, symbol.value)) {
    return false
  }

  if (isMixed.value) {
    const mixedError = validateMixedGrid(mixedGrid.value, t)
    if (mixedError) {
      showMixedGridError(mixedError)
      return false
    }
  } else {
    const sizeError = validateOrderSize(orderSizeValue.value, t, orderSizeMode.value)
    if (sizeError) {
      showOrderSizeError(sizeError)
      return false
    }

    if (gridOrdersCount.value < 1 || gridOrdersCount.value > 500) {
      formError.value = t('bots.error_grid_orders')
      return false
    }
  }

  if (!gridStepPercent.value.trim()) {
    formError.value = t('bots.error_grid_step')
    return false
  }

  const tpError = validateTakeProfit(takeProfitMode.value, takeProfitValue.value, t)
  if (tpError) {
    takeProfitError.value = tpError
    return false
  }

  const slError = validateStopLoss(stopLossMode.value, stopLossValue.value, t)
  if (slError) {
    stopLossError.value = slError
    return false
  }

  return true
}

/** Maps a failed POST /bots onto the field it is about; `false` leaves it to the form-level alert. */
function handleSubmitError(error: unknown): boolean {
  // Before the SL / TP checks: they scan the whole `detail`, which may echo the sent config back
  if (isMixed.value && isMixedGridApiError(error)) {
    showMixedGridError(parseOrderSizeApiError(error, t('bots.mixed_error_api')))
    return true
  }
  if (!isMixed.value && isOrderSizeApiError(error, orderSizeMode.value)) {
    showOrderSizeError(parseOrderSizeApiError(error, t('bots.error_order_size_invalid')))
    return true
  }
  if (isStopLossApiError(error)) {
    stopLossError.value = parseApiError(error, t('bots.error_stop_loss_percent_max'))
    return true
  }
  if (isTakeProfitApiError(error)) {
    takeProfitError.value = parseApiError(error, t('bots.error_take_profit_xor'))
    return true
  }
  return false
}

async function handleSubmit() {
  resetSubmitState()
  clearFieldErrors()

  if (!validate()) {
    return
  }

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'GRID_FUTURES',
    config: buildGridConfig(),
  }, handleSubmitError)
}

watch(takeProfitMode, (mode) => {
  if (mode === TakeProfitMode.Off) takeProfitError.value = ''
})

watch(stopLossMode, (mode) => {
  if (mode === StopLossMode.Off) stopLossError.value = ''
})

watch([orderSizeMode, orderSizeValue], () => {
  orderSizeError.value = ''
})

watch([sizingMode, mixedGrid], () => {
  mixedGridError.value = ''
}, { deep: true })

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  // Log rows written before `bot_type` existed are grid futures bots
  if (payload.bot_type && payload.bot_type !== 'GRID_FUTURES') {
    return false
  }

  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as GridFuturesConfig
  symbol.value = config.symbol
  direction.value = config.direction

  const mixed = isMixedConfig(config as unknown as Record<string, unknown>) ? parseMixedGrid(config.mixed_grid) : null
  sizingMode.value = mixed ? 'mixed' : 'legacy'
  if (mixed) {
    mixedGrid.value = mixed
  } else {
    mixedGrid.value = defaultMixedGridForm()
    const orderSize = parseOrderSize(config)
    orderSizeMode.value = orderSize.mode
    orderSizeValue.value = orderSize.value
  }

  gridOrdersCount.value = config.grid_orders_count
  gridStepPercent.value = String(config.grid_step_percent)
  volumeMode.value = config.volume_mode
  startPrice.value = config.start_price != null ? String(config.start_price) : ''
  autoRestart.value = Boolean(config.auto_restart)

  const takeProfit = parseTakeProfit(config)
  takeProfitMode.value = takeProfit.mode
  takeProfitValue.value = takeProfit.value

  const stopLoss = parseStopLoss(config)
  stopLossMode.value = stopLoss.mode
  stopLossValue.value = stopLoss.value

  resetSubmitState()
  clearFieldErrors()

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
    :api-keys="apiKeys"
    :show-clone-notice="showCloneNotice"
    :creating="creating"
    :form-error="formError"
    :engine-warning="engineWarning"
    :created-bot-id="createdBotId"
    @submit="handleSubmit"
  >
    <div class="field-row">
      <UFormField :label="$t('bots.field_direction')" class="flex-1">
        <USelect
          id="bot-direction"
          v-model="direction"
          :items="[
            { label: $t('bots.direction_long'), value: 'LONG' },
            { label: $t('bots.direction_short'), value: 'SHORT' },
          ]"
          class="w-full"
        />
      </UFormField>

      <UFormField v-if="!isMixed" :label="$t('bots.field_volume_mode')" class="flex-1">
        <USelect
          id="bot-volume-mode"
          v-model="volumeMode"
          :items="[
            { label: $t('bots.volume_linear'), value: 'linear' },
            { label: $t('bots.volume_exponential'), value: 'exponential' },
            { label: $t('bots.volume_fixed'), value: 'fixed' },
          ]"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="sizing-mode">
      <span :id="sizingModeTitleId" class="sizing-mode__title">{{ $t('bots.sizing_mode') }}</span>
      <UFieldGroup size="sm" role="group" :aria-labelledby="sizingModeTitleId">
        <AppButton
          v-for="option in sizingModeOptions"
          :key="option.value"
          type="button"
          :variant="sizingMode === option.value ? 'primary' : 'secondary'"
          :aria-pressed="sizingMode === option.value"
          @click="sizingMode = option.value"
        >
          {{ option.label }}
        </AppButton>
      </UFieldGroup>
    </div>

    <BotOrderSizeFields
      v-if="!isMixed"
      ref="orderSizeRef"
      v-model:mode="orderSizeMode"
      v-model:value="orderSizeValue"
      :symbol="symbol"
      :error="orderSizeError"
    />

    <div class="field-row">
      <UFormField :label="isMixed ? $t('bots.field_grid_step_default') : $t('bots.field_grid_step')" class="flex-1">
        <UInput
          id="bot-grid-step"
          v-model="gridStepPercent"
          inputmode="decimal"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField v-if="!isMixed" :label="$t('bots.field_grid_orders')" class="flex-1">
        <UInput
          id="bot-grid-orders"
          v-model.number="gridOrdersCount"
          type="number"
          min="1"
          max="500"
          required
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="field-row">
      <UFormField :label="$t('bots.field_start_price')" class="flex-1">
        <UInput
          id="bot-start-price"
          v-model="startPrice"
          inputmode="decimal"
          class="w-full"
        />
      </UFormField>
    </div>

    <BotMixedGridFields
      v-if="isMixed"
      ref="mixedGridRef"
      v-model:form="mixedGrid"
      :direction="direction"
      :grid-step="gridStepPercent"
      :start-price="startPrice"
      :error="mixedGridError"
    />

    <UCheckbox v-model="autoRestart" :label="$t('bots.field_auto_restart')" />

    <BotTakeProfitFields
      v-model:mode="takeProfitMode"
      v-model:value="takeProfitValue"
      :error="takeProfitError"
    />

    <BotStopLossFields
      v-model:mode="stopLossMode"
      v-model:value="stopLossValue"
      :error="stopLossError"
    />
  </BotCreateFormShell>
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.sizing-mode {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.sizing-mode__title {
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
