<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import { StopLossMode, TakeProfitMode, type AntiMartingaleFuturesConfig, type AntiMartingaleOrderLevel, type BotCreate, type BotListItem, type BotType, type GridDirection, type GridFuturesConfig, type VolumeMode } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'
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

const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
  existingBots?: BotListItem[]
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })
const botType = defineModel<BotType>('botType', { required: true })
const symbol = defineModel<string>('symbol', { required: true })
const direction = defineModel<GridDirection>('direction', { required: true })
const initialAmount = defineModel<string>('initialAmount', { required: true })
const gridOrdersCount = defineModel<number>('gridOrdersCount', { required: true })
const gridStepPercent = defineModel<string>('gridStepPercent', { required: true })
const volumeMode = defineModel<VolumeMode>('volumeMode', { required: true })
const startPrice = defineModel<string>('startPrice', { required: true })
const autoRestart = defineModel<boolean>('autoRestart', { required: true })
const takeProfitMode = defineModel<TakeProfitMode>('takeProfitMode', { required: true })
const takeProfitValue = defineModel<string>('takeProfitValue', { required: true })
const stopLossMode = defineModel<StopLossMode>('stopLossMode', { required: true })
const stopLossValue = defineModel<string>('stopLossValue', { required: true })
const amOrders = defineModel<AntiMartingaleOrderLevel[]>('amOrders', { required: true })
const amBreakoutLookbackHours = defineModel<string>('amBreakoutLookbackHours', { required: true })
const amEmaFastPeriod = defineModel<string>('amEmaFastPeriod', { required: true })
const amEmaSlowPeriod = defineModel<string>('amEmaSlowPeriod', { required: true })
const amTrailingStopPercent = defineModel<string>('amTrailingStopPercent', { required: true })
const amLeverage = defineModel<string>('amLeverage', { required: true })
const amAdvancedOpen = ref(false)

const { t } = useI18n()
const router = useRouter()
const { creating, createError, createBot } = useBots()

const formRef = ref<HTMLElement | null>(null)
const formError = ref('')
const takeProfitError = ref('')
const stopLossError = ref('')
const ordersError = ref('')
const engineWarning = ref('')
const createdBotId = ref<number | null>(null)

const apiKeyIdModel = computed({
  get: (): number | undefined => (apiKeyId.value === '' ? undefined : apiKeyId.value),
  set: (value: number | undefined) => {
    apiKeyId.value = value ?? ''
  },
})

function buildGridConfig(): GridFuturesConfig {
  const startPriceValue = startPrice.value.trim()
  const takeProfit = buildTakeProfitPayload(takeProfitMode.value, takeProfitValue.value)
  const stopLoss = buildStopLossPayload(stopLossMode.value, stopLossValue.value)

  return {
    symbol: symbol.value.trim().toUpperCase(),
    direction: direction.value,
    initial_amount: initialAmount.value.trim(),
    grid_orders_count: gridOrdersCount.value,
    grid_step_percent: gridStepPercent.value.trim(),
    volume_mode: volumeMode.value,
    auto_restart: autoRestart.value,
    take_profit_percent: takeProfit.take_profit_percent,
    take_profit_amount: takeProfit.take_profit_amount,
    stop_loss_percent: stopLoss.stop_loss_percent,
    ...(startPriceValue ? { start_price: startPriceValue } : {}),
  }
}

function buildAntiMartingaleConfig(): AntiMartingaleFuturesConfig {
  const config: AntiMartingaleFuturesConfig = {
    symbol: symbol.value.trim().toUpperCase(),
    orders: amOrders.value.map((order, index) => ({
      trigger_percent: index === 0 ? '0' : order.trigger_percent.trim(),
      size_percent: order.size_percent.trim(),
    })),
  }

  const breakoutLookbackHours = amBreakoutLookbackHours.value.trim()
  if (breakoutLookbackHours) config.breakout_lookback_hours = Number(breakoutLookbackHours)

  const emaFastPeriod = amEmaFastPeriod.value.trim()
  if (emaFastPeriod) config.ema_fast_period = Number(emaFastPeriod)

  const emaSlowPeriod = amEmaSlowPeriod.value.trim()
  if (emaSlowPeriod) config.ema_slow_period = Number(emaSlowPeriod)

  const trailingStopPercent = amTrailingStopPercent.value.trim()
  if (trailingStopPercent) config.trailing_stop_percent = trailingStopPercent

  const leverage = amLeverage.value.trim()
  if (leverage) config.leverage = Number(leverage)

  return config
}

function formatExchange(exchange: ApiKeyOut['exchange']): string {
  if (exchange === 'OTHER') return 'Other'
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}

function apiKeyLabel(key: ApiKeyOut): string {
  return `${formatExchange(key.exchange)} — ${key.label} (${key.api_key_masked})`
}

function isSymbolTakenByAntiMartingale(symbolValue: string): boolean {
  return (props.existingBots ?? []).some((bot) =>
    bot.bot_type === 'ANTI_MARTINGALE_FUTURES'
    && bot.symbol === symbolValue
    && bot.lifecycle_status !== 'CLOSED'
    && !bot.deleted_at,
  )
}

function validateAntiMartingale(symbolValue: string): boolean {
  if (isSymbolTakenByAntiMartingale(symbolValue)) {
    formError.value = t('bots.error_symbol_duplicate_am')
    return false
  }

  const orders = amOrders.value
  if (orders.length < 1) {
    ordersError.value = t('bots.error_orders_min')
    return false
  }
  if (orders.length > 10) {
    ordersError.value = t('bots.error_orders_max')
    return false
  }

  let previousTrigger = -Infinity
  for (const [index, order] of orders.entries()) {
    const trigger = index === 0 ? 0 : Number(order.trigger_percent)
    const size = Number(order.size_percent)

    if (!Number.isFinite(size) || size <= 0) {
      ordersError.value = t('bots.error_orders_size_percent')
      return false
    }

    if (index > 0) {
      if (!Number.isFinite(trigger) || trigger <= previousTrigger) {
        ordersError.value = t('bots.error_orders_trigger_order')
        return false
      }
    }

    previousTrigger = trigger
  }

  const emaFastRaw = amEmaFastPeriod.value.trim()
  const emaSlowRaw = amEmaSlowPeriod.value.trim()
  if (emaFastRaw && emaSlowRaw) {
    const emaFast = Number(emaFastRaw)
    const emaSlow = Number(emaSlowRaw)
    if (Number.isFinite(emaFast) && Number.isFinite(emaSlow) && emaFast >= emaSlow) {
      formError.value = t('bots.error_ema_order')
      return false
    }
  }

  return true
}

function validate(): boolean {
  formError.value = ''
  takeProfitError.value = ''
  stopLossError.value = ''
  ordersError.value = ''
  engineWarning.value = ''

  if (!apiKeyId.value) {
    formError.value = t('bots.error_api_key_required')
    return false
  }

  const symbolValue = symbol.value.trim().toUpperCase()
  if (symbolValue.length < 3) {
    formError.value = t('bots.error_symbol_required')
    return false
  }

  if (botType.value === 'ANTI_MARTINGALE_FUTURES') {
    return validateAntiMartingale(symbolValue)
  }

  if (!initialAmount.value.trim()) {
    formError.value = t('bots.error_amount_required')
    return false
  }

  if (gridOrdersCount.value < 1 || gridOrdersCount.value > 500) {
    formError.value = t('bots.error_grid_orders')
    return false
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

watch(takeProfitMode, (mode) => {
  if (mode === TakeProfitMode.Off) takeProfitError.value = ''
})

watch(stopLossMode, (mode) => {
  if (mode === StopLossMode.Off) stopLossError.value = ''
})

watch(botType, () => {
  formError.value = ''
  ordersError.value = ''
})

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  if (payload.bot_type) {
    botType.value = payload.bot_type
  }

  if (payload.bot_type === 'ANTI_MARTINGALE_FUTURES') {
    const config = payload.config as AntiMartingaleFuturesConfig
    symbol.value = config.symbol
    amOrders.value = config.orders.map((order) => ({ ...order }))
    amBreakoutLookbackHours.value = config.breakout_lookback_hours != null ? String(config.breakout_lookback_hours) : ''
    amEmaFastPeriod.value = config.ema_fast_period != null ? String(config.ema_fast_period) : ''
    amEmaSlowPeriod.value = config.ema_slow_period != null ? String(config.ema_slow_period) : ''
    amTrailingStopPercent.value = config.trailing_stop_percent != null ? String(config.trailing_stop_percent) : ''
    amLeverage.value = config.leverage != null ? String(config.leverage) : ''
  } else {
    const config = payload.config as GridFuturesConfig
    symbol.value = config.symbol
    direction.value = config.direction
    initialAmount.value = String(config.initial_amount)
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
  }

  formError.value = ''
  takeProfitError.value = ''
  stopLossError.value = ''
  ordersError.value = ''
  engineWarning.value = ''
  createdBotId.value = null
  createError.value = null

  return true
}

async function handleSubmit() {
  formError.value = ''
  takeProfitError.value = ''
  stopLossError.value = ''
  ordersError.value = ''
  engineWarning.value = ''
  createdBotId.value = null
  createError.value = null

  if (!validate()) {
    return
  }

  try {
    const bot = await createBot({
      api_key_id: Number(apiKeyId.value),
      bot_type: botType.value,
      config: botType.value === 'ANTI_MARTINGALE_FUTURES' ? buildAntiMartingaleConfig() : buildGridConfig(),
    })

    emit('created')

    if (bot.engine_state === 'ERROR' && bot.engine_error) {
      createdBotId.value = bot.id
      engineWarning.value = t('bots.create_engine_warning', { error: bot.engine_error })
      return
    }

    await router.push('/bots')
  } catch (error) {
    if (isStopLossApiError(error)) {
      stopLossError.value = parseApiError(error, t('bots.error_stop_loss_percent_max'))
      return
    }

    if (isTakeProfitApiError(error)) {
      takeProfitError.value = parseApiError(error, t('bots.error_take_profit_xor'))
      return
    }

    formError.value = createError.value || t('bots.create_error')
  }
}

function scrollIntoView() {
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ applyPayload, scrollIntoView })
</script>

<template>
  <UCard class="create-form-card">
    <div ref="formRef">
      <p v-if="showCloneNotice" class="clone-notice" role="status">
        {{ $t('bots.creation_history_cloned') }}
      </p>

      <form class="create-form flex flex-col gap-4" @submit.prevent="handleSubmit">
        <UFormField :label="$t('bots.field_api_key')">
          <USelect
            id="bot-api-key"
            v-model="apiKeyIdModel"
            :items="apiKeys.map((key) => ({ label: apiKeyLabel(key), value: key.id }))"
            placeholder="—"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('bots.field_bot_type')">
          <USelect
            id="bot-type"
            v-model="botType"
            :items="[
              { label: $t('bots.type_grid_futures'), value: 'GRID_FUTURES' },
              { label: $t('bots.type_anti_martingale_futures'), value: 'ANTI_MARTINGALE_FUTURES' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('bots.field_symbol')">
          <UInput
            id="bot-symbol"
            v-model="symbol"
            :placeholder="$t('bots.field_symbol_hint')"
            autocomplete="off"
            required
            class="w-full"
          />
          <template #hint>
            {{ $t('bots.field_symbol_hint') }}
          </template>
        </UFormField>

        <template v-if="botType === 'GRID_FUTURES'">
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

            <UFormField :label="$t('bots.field_volume_mode')" class="flex-1">
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

          <div class="field-row">
            <UFormField :label="$t('bots.field_initial_amount')" class="flex-1">
              <UInput
                id="bot-initial-amount"
                v-model="initialAmount"
                inputmode="decimal"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('bots.field_grid_step')" class="flex-1">
              <UInput
                id="bot-grid-step"
                v-model="gridStepPercent"
                inputmode="decimal"
                required
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="field-row">
            <UFormField :label="$t('bots.field_grid_orders')" class="flex-1">
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

            <UFormField :label="$t('bots.field_start_price')" class="flex-1">
              <UInput
                id="bot-start-price"
                v-model="startPrice"
                inputmode="decimal"
                class="w-full"
              />
            </UFormField>
          </div>

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
        </template>

        <template v-else-if="botType === 'ANTI_MARTINGALE_FUTURES'">
          <BotAntiMartingaleOrdersFields
            v-model:orders="amOrders"
            :error="ordersError"
          />

          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            class="am-advanced-toggle"
            :trailing-icon="amAdvancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            @click="amAdvancedOpen = !amAdvancedOpen"
          >
            {{ $t('bots.am_advanced_settings') }}
          </AppButton>

          <div v-if="amAdvancedOpen" class="am-advanced">
            <p class="am-advanced__hint">{{ $t('bots.am_advanced_settings_hint') }}</p>

            <div class="field-row">
              <UFormField :label="$t('bots.field_breakout_lookback_hours')" class="flex-1">
                <UInput
                  id="am-breakout-lookback"
                  v-model="amBreakoutLookbackHours"
                  type="number"
                  placeholder="99"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('bots.field_trailing_stop_percent')" class="flex-1">
                <UInput
                  id="am-trailing-stop"
                  v-model="amTrailingStopPercent"
                  inputmode="decimal"
                  placeholder="4"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="field-row">
              <UFormField :label="$t('bots.field_ema_fast_period')" class="flex-1">
                <UInput
                  id="am-ema-fast"
                  v-model="amEmaFastPeriod"
                  type="number"
                  placeholder="50"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('bots.field_ema_slow_period')" class="flex-1">
                <UInput
                  id="am-ema-slow"
                  v-model="amEmaSlowPeriod"
                  type="number"
                  placeholder="200"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField :label="$t('bots.field_leverage')">
              <UInput
                id="am-leverage"
                v-model="amLeverage"
                type="number"
                min="1"
                max="125"
                placeholder="20"
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
        <UAlert v-if="engineWarning" color="warning" variant="subtle" :title="engineWarning" />

        <div class="form-actions flex flex-wrap gap-2">
          <AppButton type="submit" :loading="creating">
            {{ $t('bots.create_submit') }}
          </AppButton>
          <AppButton
            v-if="createdBotId"
            variant="secondary"
            to="/bots"
          >
            {{ $t('bots.back_to_bots') }}
          </AppButton>
        </div>
      </form>
    </div>
  </UCard>
</template>

<style scoped>
.create-form-card {
  padding: 32px;
}

.clone-notice {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
  font-size: 0.85rem;
  font-weight: 600;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.am-advanced-toggle {
  align-self: flex-start;
}

.am-advanced {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.am-advanced__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .create-form-card {
    padding: 20px;
  }

  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions > * {
    width: 100%;
  }

  .form-actions :deep(button),
  .form-actions :deep(a) {
    width: 100%;
    justify-content: center;
    min-height: 44px;
  }
}
</style>
