<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreationLogOut, GridDirection, VolumeMode } from '#shared/types/bot'
import { parseBotCreatePayload } from '~/utils/parseBotCreatePayload'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const router = useRouter()
const { creating, createError, fetchApiKeys, fetchCreationHistory, createBot } = useBots()

useSeoMeta({
  title: () => t('bots.create_title'),
  description: () => t('bots.create_subtitle'),
})

const apiKeys = ref<ApiKeyOut[]>([])
const keysLoading = ref(true)
const formError = ref('')
const engineWarning = ref('')
const createdBotId = ref<number | null>(null)
const clonedFromId = ref<number | null>(null)
const formRef = ref<HTMLElement | null>(null)

const creationHistory = ref<BotCreationLogOut[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

const apiKeyId = ref<number | ''>('')
const apiKeyIdModel = computed({
  get: (): number | undefined => (apiKeyId.value === '' ? undefined : apiKeyId.value),
  set: (value: number | undefined) => {
    apiKeyId.value = value ?? ''
  },
})
const symbol = ref('ETHUSDT')
const direction = ref<GridDirection>('LONG')
const initialAmount = ref('0.01')
const gridOrdersCount = ref(10)
const gridStepPercent = ref('5')
const volumeMode = ref<VolumeMode>('linear')
const startPrice = ref('')
const autoRestart = ref(false)

function formatExchange(exchange: ApiKeyOut['exchange']): string {
  if (exchange === 'OTHER') return 'Other'
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}

function apiKeyLabel(key: ApiKeyOut): string {
  return `${formatExchange(key.exchange)} — ${key.label} (${key.api_key_masked})`
}

function applyPayloadToForm(payload: ReturnType<typeof parseBotCreatePayload>) {
  if (!payload) return false

  const keyExists = apiKeys.value.some((key) => key.id === payload.api_key_id)
  apiKeyId.value = keyExists ? payload.api_key_id : ''

  const config = payload.config
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

async function loadCreationHistory() {
  historyLoading.value = true
  historyError.value = null

  try {
    creationHistory.value = await fetchCreationHistory(30)
  } catch {
    historyError.value = t('bots.creation_history_load_error')
    creationHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

async function loadPageData() {
  keysLoading.value = true
  try {
    apiKeys.value = await fetchApiKeys()
    if (apiKeys.value.length === 1) {
      const onlyKey = apiKeys.value[0]
      if (onlyKey) {
        apiKeyId.value = onlyKey.id
      }
    }
    await loadCreationHistory()
  } catch {
    formError.value = t('bots.create_error')
  } finally {
    keysLoading.value = false
  }
}

onMounted(() => {
  loadPageData()
})

function cloneFromHistory(item: BotCreationLogOut) {
  const payload = parseBotCreatePayload(item.request_payload)
  if (!payload) {
    formError.value = t('bots.creation_history_clone_error')
    return
  }

  if (!applyPayloadToForm(payload)) {
    formError.value = t('bots.creation_history_clone_error')
    return
  }

  clonedFromId.value = item.id
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

async function handleSubmit() {
  formError.value = ''
  engineWarning.value = ''
  createdBotId.value = null
  createError.value = null

  if (!validate()) {
    return
  }

  const startPriceValue = startPrice.value.trim()

  try {
    const bot = await createBot({
      api_key_id: Number(apiKeyId.value),
      bot_type: 'GRID_FUTURES',
      config: {
        symbol: symbol.value.trim().toUpperCase(),
        direction: direction.value,
        initial_amount: initialAmount.value.trim(),
        grid_orders_count: gridOrdersCount.value,
        grid_step_percent: gridStepPercent.value.trim(),
        volume_mode: volumeMode.value,
        auto_restart: autoRestart.value,
        ...(startPriceValue ? { start_price: startPriceValue } : {}),
      },
    })

    await loadCreationHistory()
    clonedFromId.value = null

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
</script>

<template>
  <main class="page-section">
    <div class="container create-container">
      <div class="page-header">
        <div>
          <span class="section-label">{{ $t('bots.create_title') }}</span>
          <h1 class="section-title">{{ $t('bots.create_subtitle') }}</h1>
        </div>
        <UButton color="neutral" variant="outline" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </UButton>
      </div>

      <p v-if="keysLoading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <UCard v-else-if="!apiKeys.length" class="create-card text-center">
        <p class="create-card__desc mb-4">{{ $t('bots.no_api_keys') }}</p>
        <UButton to="/settings#api-keys">
          {{ $t('bots.manage_api_keys') }}
        </UButton>
      </UCard>

      <div v-else class="create-layout">
        <UCard class="create-card">
          <div ref="formRef">
          <p v-if="clonedFromId" class="clone-notice" role="status">
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

        <BotCreationHistory
          :items="creationHistory"
          :loading="historyLoading"
          :error="historyError"
          :selected-id="clonedFromId"
          @select="cloneFromHistory"
          @retry="loadCreationHistory"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.create-container {
  max-width: 1080px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
}

.create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: start;
}

.create-card {
  padding: 32px;
}

.create-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
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

.state-message {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

@media (max-width: 900px) {
  .create-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
