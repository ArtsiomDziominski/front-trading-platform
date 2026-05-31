<script setup lang="ts">
import type { BotType, GridDirection, GridFuturesConfig, LiquidationCheckOut, VolumeMode } from '#shared/types/bot'

const botType = defineModel<BotType>('botType', { required: true })
const symbol = defineModel<string>('symbol', { required: true })
const direction = defineModel<GridDirection>('direction', { required: true })
const initialAmount = defineModel<string>('initialAmount', { required: true })
const gridOrdersCount = defineModel<number>('gridOrdersCount', { required: true })
const gridStepPercent = defineModel<string>('gridStepPercent', { required: true })
const volumeMode = defineModel<VolumeMode>('volumeMode', { required: true })
const startPrice = defineModel<string>('startPrice', { required: true })
const leverage = defineModel<number>('leverage', { required: true })
const currentPrice = defineModel<string>('currentPrice', { required: true })
const totalBalance = defineModel<string>('totalBalance', { required: true })

const { t } = useI18n()
const { liquidationChecking, liquidationError, checkLiquidation, creating } = useBots()

const liquidationResult = ref<LiquidationCheckOut | null>(null)
const liquidationCheckError = ref('')

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
})

function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

function buildLiquidationConfig(): GridFuturesConfig {
  const startPriceValue = startPrice.value.trim()

  return {
    symbol: symbol.value.trim().toUpperCase(),
    direction: direction.value,
    initial_amount: initialAmount.value.trim(),
    grid_orders_count: gridOrdersCount.value,
    grid_step_percent: gridStepPercent.value.trim(),
    volume_mode: volumeMode.value,
    ...(startPriceValue ? { start_price: startPriceValue } : {}),
  }
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clearLiquidationResult() {
  liquidationResult.value = null
  liquidationError.value = null
  liquidationCheckError.value = ''
}

function validateLiquidation(): boolean {
  liquidationCheckError.value = ''

  const symbolValue = symbol.value.trim().toUpperCase()
  if (symbolValue.length < 3) {
    liquidationCheckError.value = t('bots.error_symbol_required')
    return false
  }

  if (!initialAmount.value.trim()) {
    liquidationCheckError.value = t('bots.error_amount_required')
    return false
  }

  if (gridOrdersCount.value < 1 || gridOrdersCount.value > 500) {
    liquidationCheckError.value = t('bots.error_grid_orders')
    return false
  }

  if (!gridStepPercent.value.trim()) {
    liquidationCheckError.value = t('bots.error_grid_step')
    return false
  }

  if (leverage.value < 1 || leverage.value > 125) {
    liquidationCheckError.value = t('bots.error_leverage')
    return false
  }

  const currentPriceValue = parseOptionalNumber(currentPrice.value)
  if (currentPriceValue != null && currentPriceValue <= 0) {
    liquidationCheckError.value = t('bots.error_current_price')
    return false
  }

  const totalBalanceValue = parseOptionalNumber(totalBalance.value)
  if (totalBalanceValue == null) {
    liquidationCheckError.value = t('bots.error_total_balance_required')
    return false
  }
  if (totalBalanceValue <= 0) {
    liquidationCheckError.value = t('bots.error_total_balance')
    return false
  }

  return true
}

async function handleCheckLiquidation() {
  clearLiquidationResult()

  if (!validateLiquidation()) {
    return
  }

  const currentPriceValue = parseOptionalNumber(currentPrice.value)
  const totalBalanceValue = parseOptionalNumber(totalBalance.value)

  if (totalBalanceValue == null) {
    return
  }

  try {
    liquidationResult.value = await checkLiquidation({
      bot_type: botType.value,
      config: buildLiquidationConfig(),
      leverage: leverage.value,
      total_balance: totalBalanceValue,
      ...(currentPriceValue != null ? { current_price: currentPriceValue } : {}),
    })
  } catch {
    liquidationCheckError.value = liquidationError.value || t('bots.liquidation_check_error')
  }
}

watch(
  [botType, symbol, direction, initialAmount, gridOrdersCount, gridStepPercent, volumeMode, startPrice, leverage, currentPrice, totalBalance],
  clearLiquidationResult,
)

defineExpose({ clearResult: clearLiquidationResult })
</script>

<template>
  <UCard class="liquidation-card">
    <h2 class="liquidation-section__title">{{ $t('bots.liquidation_section_title') }}</h2>
    <p class="liquidation-section__desc">{{ $t('bots.liquidation_section_desc') }}</p>

    <div class="liquidation-section">
      <UFormField :label="$t('bots.field_bot_type')">
        <USelect
          id="liquidation-bot-type"
          v-model="botType"
          :items="[
            { label: $t('bots.type_grid_futures'), value: 'GRID_FUTURES' },
          ]"
          class="w-full"
        />
      </UFormField>

      <p class="liquidation-section__group">{{ $t('bots.liquidation_config_group') }}</p>

      <UFormField :label="$t('bots.field_symbol')">
        <UInput
          id="liquidation-symbol"
          v-model="symbol"
          :placeholder="$t('bots.field_symbol_hint')"
          autocomplete="off"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_direction')">
        <USelect
          id="liquidation-direction"
          v-model="direction"
          :items="[
            { label: $t('bots.direction_long'), value: 'LONG' },
            { label: $t('bots.direction_short'), value: 'SHORT' },
          ]"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_initial_amount')">
        <UInput
          id="liquidation-initial-amount"
          v-model="initialAmount"
          inputmode="decimal"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_grid_orders')">
        <UInput
          id="liquidation-grid-orders"
          v-model.number="gridOrdersCount"
          type="number"
          min="1"
          max="500"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_grid_step')">
        <UInput
          id="liquidation-grid-step"
          v-model="gridStepPercent"
          inputmode="decimal"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_volume_mode')">
        <USelect
          id="liquidation-volume-mode"
          v-model="volumeMode"
          :items="[
            { label: $t('bots.volume_linear'), value: 'linear' },
            { label: $t('bots.volume_exponential'), value: 'exponential' },
            { label: $t('bots.volume_fixed'), value: 'fixed' },
          ]"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_start_price')">
        <UInput
          id="liquidation-start-price"
          v-model="startPrice"
          inputmode="decimal"
          class="w-full"
        />
        <template #hint>
          {{ $t('bots.liquidation_start_price_hint') }}
        </template>
      </UFormField>

      <p class="liquidation-section__group">{{ $t('bots.liquidation_market_group') }}</p>

      <UFormField :label="$t('bots.field_leverage')">
        <UInput
          id="bot-leverage"
          v-model.number="leverage"
          type="number"
          min="1"
          max="125"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('bots.field_current_price')">
        <UInput
          id="bot-current-price"
          v-model="currentPrice"
          inputmode="decimal"
          class="w-full"
        />
        <template #hint>
          {{ $t('bots.field_current_price_hint') }}
        </template>
      </UFormField>

      <UFormField :label="$t('bots.field_total_balance')" required>
        <UInput
          id="bot-total-balance"
          v-model="totalBalance"
          inputmode="decimal"
          required
          class="w-full"
        />
        <template #hint>
          {{ $t('bots.field_total_balance_hint') }}
        </template>
      </UFormField>

      <UAlert v-if="liquidationCheckError" color="error" variant="subtle" :title="liquidationCheckError" />

      <UButton
        type="button"
        color="neutral"
        variant="outline"
        class="w-full"
        :loading="liquidationChecking"
        :disabled="creating"
        @click="handleCheckLiquidation"
      >
        {{ $t('bots.liquidation_check_submit') }}
      </UButton>

      <div v-if="liquidationResult" class="liquidation-result" role="status">
        <div class="liquidation-result__row">
          <span class="liquidation-result__label">{{ $t('bots.liquidation_avg_entry') }}</span>
          <span class="liquidation-result__value">{{ formatPrice(liquidationResult.avg_entry_price) }}</span>
        </div>
        <div class="liquidation-result__row">
          <span class="liquidation-result__label">{{ $t('bots.liquidation_price') }}</span>
          <span class="liquidation-result__value liquidation-result__value--accent">
            {{ formatPrice(liquidationResult.liquidation_price) }}
          </span>
        </div>
        <div class="liquidation-result__row">
          <span class="liquidation-result__label">{{ $t('bots.liquidation_total_quantity') }}</span>
          <span class="liquidation-result__value">{{ formatPrice(liquidationResult.total_base_quantity) }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.liquidation-card {
  padding: 24px;
}

.liquidation-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.liquidation-section__title {
  margin: 0;
  font-size: 1rem;
}

.liquidation-section__desc {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.liquidation-section__group {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.liquidation-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.liquidation-result__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.liquidation-result__label {
  color: var(--color-text-muted);
  font-size: 0.88rem;
}

.liquidation-result__value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.liquidation-result__value--accent {
  color: var(--color-accent);
}
</style>
