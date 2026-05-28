<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { GridDirection, VolumeMode } from '#shared/types/bot'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const router = useRouter()
const { creating, createError, fetchApiKeys, createBot } = useBots()

useSeoMeta({
  title: () => t('bots.create_title'),
  description: () => t('bots.create_subtitle'),
})

const apiKeys = ref<ApiKeyOut[]>([])
const keysLoading = ref(true)
const formError = ref('')
const engineWarning = ref('')
const createdBotId = ref<number | null>(null)

const apiKeyId = ref<number | ''>('')
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

onMounted(async () => {
  keysLoading.value = true
  try {
    apiKeys.value = await fetchApiKeys()
    if (apiKeys.value.length === 1) {
      const onlyKey = apiKeys.value[0]
      if (onlyKey) {
        apiKeyId.value = onlyKey.id
      }
    }
  } catch {
    formError.value = t('bots.create_error')
  } finally {
    keysLoading.value = false
  }
})

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
        <NeumoButton variant="secondary" tag="NuxtLink" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </NeumoButton>
      </div>

      <p v-if="keysLoading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <NeumoCard v-else-if="!apiKeys.length" variant="raised" class="create-card">
        <p class="create-card__desc">{{ $t('bots.no_api_keys') }}</p>
        <NeumoButton variant="primary" tag="NuxtLink" to="/exchanges">
          {{ $t('bots.go_to_exchanges') }}
        </NeumoButton>
      </NeumoCard>

      <NeumoCard v-else variant="raised" class="create-card">
        <form class="create-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="field-label" for="bot-api-key">{{ $t('bots.field_api_key') }}</label>
            <select
              id="bot-api-key"
              v-model="apiKeyId"
              class="field-input neumo-sm-inset"
              required
            >
              <option disabled value="">
                —
              </option>
              <option v-for="key in apiKeys" :key="key.id" :value="key.id">
                {{ apiKeyLabel(key) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="bot-symbol">{{ $t('bots.field_symbol') }}</label>
            <input
              id="bot-symbol"
              v-model="symbol"
              type="text"
              class="field-input neumo-sm-inset"
              :placeholder="$t('bots.field_symbol_hint')"
              autocomplete="off"
              required
            />
            <p class="field-hint">{{ $t('bots.field_symbol_hint') }}</p>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="bot-direction">{{ $t('bots.field_direction') }}</label>
              <select id="bot-direction" v-model="direction" class="field-input neumo-sm-inset">
                <option value="LONG">
                  {{ $t('bots.direction_long') }}
                </option>
                <option value="SHORT">
                  {{ $t('bots.direction_short') }}
                </option>
              </select>
            </div>

            <div class="field">
              <label class="field-label" for="bot-volume-mode">{{ $t('bots.field_volume_mode') }}</label>
              <select id="bot-volume-mode" v-model="volumeMode" class="field-input neumo-sm-inset">
                <option value="linear">
                  {{ $t('bots.volume_linear') }}
                </option>
                <option value="exponential">
                  {{ $t('bots.volume_exponential') }}
                </option>
                <option value="fixed">
                  {{ $t('bots.volume_fixed') }}
                </option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="bot-initial-amount">{{ $t('bots.field_initial_amount') }}</label>
              <input
                id="bot-initial-amount"
                v-model="initialAmount"
                type="text"
                inputmode="decimal"
                class="field-input neumo-sm-inset"
                required
              />
            </div>

            <div class="field">
              <label class="field-label" for="bot-grid-step">{{ $t('bots.field_grid_step') }}</label>
              <input
                id="bot-grid-step"
                v-model="gridStepPercent"
                type="text"
                inputmode="decimal"
                class="field-input neumo-sm-inset"
                required
              />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="bot-grid-orders">{{ $t('bots.field_grid_orders') }}</label>
              <input
                id="bot-grid-orders"
                v-model.number="gridOrdersCount"
                type="number"
                min="1"
                max="500"
                class="field-input neumo-sm-inset"
                required
              />
            </div>

            <div class="field">
              <label class="field-label" for="bot-start-price">{{ $t('bots.field_start_price') }}</label>
              <input
                id="bot-start-price"
                v-model="startPrice"
                type="text"
                inputmode="decimal"
                class="field-input neumo-sm-inset"
              />
            </div>
          </div>

          <label class="field-checkbox">
            <input v-model="autoRestart" type="checkbox">
            <span>{{ $t('bots.field_auto_restart') }}</span>
          </label>

          <p v-if="formError" class="form-message form-message--error" role="alert">
            {{ formError }}
          </p>
          <p v-if="engineWarning" class="form-message form-message--warning" role="status">
            {{ engineWarning }}
          </p>

          <div class="form-actions">
            <NeumoButton variant="primary" size="md" type="submit" :disabled="creating">
              {{ creating ? $t('common.loading') : $t('bots.create_submit') }}
            </NeumoButton>
            <NeumoButton
              v-if="createdBotId"
              variant="secondary"
              size="md"
              tag="NuxtLink"
              to="/bots"
            >
              {{ $t('bots.back_to_bots') }}
            </NeumoButton>
          </div>
        </form>
      </NeumoCard>
    </div>
  </main>
</template>

<style scoped>
.create-container {
  max-width: 640px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
}

.create-card {
  padding: 32px;
}

.create-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.field-input {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: box-shadow 0.2s;
}

.field-input:focus {
  box-shadow: var(--shadow-sm);
}

.field-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  cursor: pointer;
}

.field-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-accent);
}

.form-message {
  margin: 0;
  font-size: 0.9rem;
}

.form-message--error {
  color: var(--color-danger);
}

.form-message--warning {
  color: var(--color-text-muted);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.state-message {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
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
