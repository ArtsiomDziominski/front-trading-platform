<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { AntiMartingaleFuturesConfig, AntiMartingaleOrderLevel, BotCreate, BotListItem } from '#shared/types/bot'

const props = defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
  existingBots?: BotListItem[]
}>()

const emit = defineEmits<{
  created: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })

const symbol = ref('ETHUSDT')
const orders = ref<AntiMartingaleOrderLevel[]>([
  { trigger_percent: '0', size_percent: '33.75' },
  { trigger_percent: '1.5', size_percent: '33.75' },
  { trigger_percent: '3.0', size_percent: '42.5' },
  { trigger_percent: '5.0', size_percent: '50' },
  { trigger_percent: '7.5', size_percent: '67.5' },
])
const breakoutLookbackHours = ref('')
const emaFastPeriod = ref('')
const emaSlowPeriod = ref('')
const trailingStopPercent = ref('')
const leverage = ref('')
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
const ordersError = ref('')

/** UInput type="number" writes a number into its v-model at runtime despite the string type. */
function toTrimmed(value: unknown): string {
  return String(value ?? '').trim()
}

function buildConfig(): AntiMartingaleFuturesConfig {
  const config: AntiMartingaleFuturesConfig = {
    symbol: symbol.value.trim().toUpperCase(),
    orders: orders.value.map((order, index) => ({
      trigger_percent: index === 0 ? '0' : toTrimmed(order.trigger_percent),
      size_percent: toTrimmed(order.size_percent),
    })),
  }

  const lookback = toTrimmed(breakoutLookbackHours.value)
  if (lookback) config.breakout_lookback_hours = Number(lookback)

  const emaFast = toTrimmed(emaFastPeriod.value)
  if (emaFast) config.ema_fast_period = Number(emaFast)

  const emaSlow = toTrimmed(emaSlowPeriod.value)
  if (emaSlow) config.ema_slow_period = Number(emaSlow)

  const trailingStop = toTrimmed(trailingStopPercent.value)
  if (trailingStop) config.trailing_stop_percent = trailingStop

  const leverageValue = toTrimmed(leverage.value)
  if (leverageValue) config.leverage = Number(leverageValue)

  return config
}

function isSymbolTaken(symbolValue: string): boolean {
  return (props.existingBots ?? []).some((bot) =>
    bot.bot_type === 'ANTI_MARTINGALE_FUTURES'
    && bot.symbol === symbolValue
    && bot.lifecycle_status !== 'CLOSED'
    && !bot.deleted_at,
  )
}

function validate(): boolean {
  if (!validateBase(apiKeyId.value, symbol.value)) {
    return false
  }

  if (isSymbolTaken(symbol.value.trim().toUpperCase())) {
    formError.value = t('bots.error_symbol_duplicate_am')
    return false
  }

  const levels = orders.value
  if (levels.length < 1) {
    ordersError.value = t('bots.error_orders_min')
    return false
  }
  if (levels.length > 10) {
    ordersError.value = t('bots.error_orders_max')
    return false
  }

  let previousTrigger = -Infinity
  for (const [index, order] of levels.entries()) {
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

  const emaFastRaw = toTrimmed(emaFastPeriod.value)
  const emaSlowRaw = toTrimmed(emaSlowPeriod.value)
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

async function handleSubmit() {
  resetSubmitState()
  ordersError.value = ''

  if (!validate()) {
    return
  }

  await submit({
    api_key_id: Number(apiKeyId.value),
    bot_type: 'ANTI_MARTINGALE_FUTURES',
    config: buildConfig(),
  })
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  if (payload.bot_type !== 'ANTI_MARTINGALE_FUTURES') {
    return false
  }

  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config as AntiMartingaleFuturesConfig
  symbol.value = config.symbol
  orders.value = config.orders.map((order) => ({ ...order }))
  breakoutLookbackHours.value = config.breakout_lookback_hours != null ? String(config.breakout_lookback_hours) : ''
  emaFastPeriod.value = config.ema_fast_period != null ? String(config.ema_fast_period) : ''
  emaSlowPeriod.value = config.ema_slow_period != null ? String(config.ema_slow_period) : ''
  trailingStopPercent.value = config.trailing_stop_percent != null ? String(config.trailing_stop_percent) : ''
  leverage.value = config.leverage != null ? String(config.leverage) : ''

  resetSubmitState()
  ordersError.value = ''

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
    <BotAntiMartingaleOrdersFields
      v-model:orders="orders"
      :error="ordersError"
    />

    <AppButton
      type="button"
      variant="secondary"
      size="sm"
      class="am-advanced-toggle"
      :trailing-icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      @click="advancedOpen = !advancedOpen"
    >
      {{ $t('bots.am_advanced_settings') }}
    </AppButton>

    <div v-if="advancedOpen" class="am-advanced">
      <p class="am-advanced__hint">{{ $t('bots.am_advanced_settings_hint') }}</p>

      <div class="field-row">
        <UFormField :label="$t('bots.field_breakout_lookback_hours')" class="flex-1">
          <UInput
            id="am-breakout-lookback"
            v-model="breakoutLookbackHours"
            type="number"
            placeholder="99"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('bots.field_trailing_stop_percent')" class="flex-1">
          <UInput
            id="am-trailing-stop"
            v-model="trailingStopPercent"
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
            v-model="emaFastPeriod"
            type="number"
            placeholder="50"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('bots.field_ema_slow_period')" class="flex-1">
          <UInput
            id="am-ema-slow"
            v-model="emaSlowPeriod"
            type="number"
            placeholder="200"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('bots.field_leverage')">
        <UInput
          id="am-leverage"
          v-model="leverage"
          type="number"
          min="1"
          max="125"
          placeholder="20"
          class="w-full"
        />
      </UFormField>
    </div>
  </BotCreateFormShell>
</template>

<style scoped>
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
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
