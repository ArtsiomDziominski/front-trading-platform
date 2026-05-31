<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, BotType, GridDirection, GridFuturesConfig, VolumeMode } from '#shared/types/bot'

defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
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

const { t } = useI18n()
const router = useRouter()
const { creating, createError, createBot } = useBots()

const formRef = ref<HTMLElement | null>(null)
const formError = ref('')
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

  return {
    symbol: symbol.value.trim().toUpperCase(),
    direction: direction.value,
    initial_amount: initialAmount.value.trim(),
    grid_orders_count: gridOrdersCount.value,
    grid_step_percent: gridStepPercent.value.trim(),
    volume_mode: volumeMode.value,
    auto_restart: autoRestart.value,
    ...(startPriceValue ? { start_price: startPriceValue } : {}),
  }
}

function formatExchange(exchange: ApiKeyOut['exchange']): string {
  if (exchange === 'OTHER') return 'Other'
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}

function apiKeyLabel(key: ApiKeyOut): string {
  return `${formatExchange(key.exchange)} — ${key.label} (${key.api_key_masked})`
}

function validate(): boolean {
  formError.value = ''
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

  return true
}

function applyPayload(payload: BotCreate, keys: ApiKeyOut[]): boolean {
  const keyExists = keys.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config
  if (payload.bot_type) {
    botType.value = payload.bot_type
  }
  symbol.value = config.symbol
  direction.value = config.direction
  initialAmount.value = String(config.initial_amount)
  gridOrdersCount.value = config.grid_orders_count
  gridStepPercent.value = String(config.grid_step_percent)
  volumeMode.value = config.volume_mode
  startPrice.value = config.start_price != null ? String(config.start_price) : ''
  autoRestart.value = Boolean(config.auto_restart)

  formError.value = ''
  engineWarning.value = ''
  createdBotId.value = null
  createError.value = null

  return true
}

async function handleSubmit() {
  formError.value = ''
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
      config: buildGridConfig(),
    })

    emit('created')

    if (bot.engine_state === 'ERROR' && bot.engine_error) {
      createdBotId.value = bot.id
      engineWarning.value = t('bots.create_engine_warning', { error: bot.engine_error })
      return
    }

    await router.push('/bots')
  } catch {
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

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
        <UAlert v-if="engineWarning" color="warning" variant="subtle" :title="engineWarning" />

        <div class="form-actions flex flex-wrap gap-2">
          <UButton type="submit" :loading="creating">
            {{ $t('bots.create_submit') }}
          </UButton>
          <UButton
            v-if="createdBotId"
            color="neutral"
            variant="outline"
            to="/bots"
          >
            {{ $t('bots.back_to_bots') }}
          </UButton>
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

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
