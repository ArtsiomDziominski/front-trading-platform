<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import { OrderSizeMode, StopLossMode, TakeProfitMode, type BotCreate, type GridDirection, type GridSizingMode, type VolumeMode } from '#shared/types/bot'
import { defaultMixedGridForm, type MixedGridForm } from '~/utils/mixedGrid'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('bots.type_grid_futures'),
  description: () => t('bots.create_subtitle'),
})

const formRef = ref<{
  applyPayload: (payload: BotCreate, keys: ApiKeyOut[]) => boolean
  scrollIntoView: () => void
} | null>(null)
const liquidationCheckRef = ref<{ clearResult: () => void } | null>(null)

const {
  apiKeys,
  keysLoading,
  pageError,
  apiKeyId,
  clonedFromId,
  creationHistory,
  historyLoading,
  historyError,
  historyFavoritesOnly,
  loadCreationHistory,
  toggleHistoryFavorite,
  cloneFromHistory,
  handleBotCreated,
} = useBotCreatePage('GRID_FUTURES', {
  applyPayload: (payload, keys) => formRef.value?.applyPayload(payload, keys) ?? false,
  onCloned: () => {
    liquidationCheckRef.value?.clearResult()
    formRef.value?.scrollIntoView()
  },
})

const symbol = ref('ETHUSDT')
const direction = ref<GridDirection>('LONG')
const orderSizeMode = ref<OrderSizeMode>(OrderSizeMode.Coin)
const orderSizeValue = ref('0.01')
const gridOrdersCount = ref(10)
const gridStepPercent = ref('5')
const volumeMode = ref<VolumeMode>('linear')
const startPrice = ref('')
const autoRestart = ref(false)
const takeProfitMode = ref<TakeProfitMode>(TakeProfitMode.Off)
const takeProfitValue = ref('')
const stopLossMode = ref<StopLossMode>(StopLossMode.Off)
const stopLossValue = ref('')
const sizingMode = ref<GridSizingMode>('legacy')
const mixedGrid = ref<MixedGridForm>(defaultMixedGridForm())
const leverage = ref(10)
const currentPrice = ref('')
const totalBalance = ref('')
</script>

<template>
  <BotCreatePageShell
    :title="$t('bots.type_grid_futures')"
    :market-label="$t('bots.market_futures')"
    :loading="keysLoading"
    :has-api-keys="apiKeys.length > 0"
  >
    <UAlert v-if="pageError" color="error" variant="subtle" :title="pageError" />

    <BotGridFuturesForm
      ref="formRef"
      v-model:api-key-id="apiKeyId"
      v-model:symbol="symbol"
      v-model:direction="direction"
      v-model:order-size-mode="orderSizeMode"
      v-model:order-size-value="orderSizeValue"
      v-model:grid-orders-count="gridOrdersCount"
      v-model:grid-step-percent="gridStepPercent"
      v-model:volume-mode="volumeMode"
      v-model:start-price="startPrice"
      v-model:auto-restart="autoRestart"
      v-model:take-profit-mode="takeProfitMode"
      v-model:take-profit-value="takeProfitValue"
      v-model:stop-loss-mode="stopLossMode"
      v-model:stop-loss-value="stopLossValue"
      v-model:sizing-mode="sizingMode"
      v-model:mixed-grid="mixedGrid"
      :api-keys="apiKeys"
      :show-clone-notice="clonedFromId != null"
      @created="handleBotCreated"
    />

    <BotCreationHistory
      v-model:favorites-only="historyFavoritesOnly"
      :items="creationHistory"
      :loading="historyLoading"
      :error="historyError"
      :selected-id="clonedFromId"
      @toggle-favorite="toggleHistoryFavorite"
      @select="cloneFromHistory"
      @retry="loadCreationHistory"
    />

    <template #sidebar>
      <BotLiquidationCheck
        ref="liquidationCheckRef"
        v-model:symbol="symbol"
        v-model:direction="direction"
        v-model:order-size-mode="orderSizeMode"
        v-model:order-size-value="orderSizeValue"
        v-model:grid-orders-count="gridOrdersCount"
        v-model:grid-step-percent="gridStepPercent"
        v-model:volume-mode="volumeMode"
        v-model:start-price="startPrice"
        v-model:take-profit-mode="takeProfitMode"
        v-model:take-profit-value="takeProfitValue"
        v-model:stop-loss-mode="stopLossMode"
        v-model:stop-loss-value="stopLossValue"
        v-model:leverage="leverage"
        v-model:current-price="currentPrice"
        v-model:total-balance="totalBalance"
        v-model:sizing-mode="sizingMode"
        v-model:mixed-grid="mixedGrid"
      />
    </template>
  </BotCreatePageShell>
</template>
