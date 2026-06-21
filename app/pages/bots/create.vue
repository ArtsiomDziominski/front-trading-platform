<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreationLogOut, BotCreate, BotType, GridDirection, VolumeMode } from '#shared/types/bot'
import { parseBotCreatePayload } from '~/utils/parseBotCreatePayload'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const { fetchApiKeys, fetchCreationHistory } = useBots()

useSeoMeta({
  title: () => t('bots.create_title'),
  description: () => t('bots.create_subtitle'),
})

const apiKeys = ref<ApiKeyOut[]>([])
const keysLoading = ref(true)
const formError = ref('')
const clonedFromId = ref<number | null>(null)
const createFormRef = ref<{
  applyPayload: (payload: BotCreate, keys: ApiKeyOut[]) => boolean
  scrollIntoView: () => void
} | null>(null)
const liquidationCheckRef = ref<{ clearResult: () => void } | null>(null)

const creationHistory = ref<BotCreationLogOut[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

const apiKeyId = ref<number | ''>('')
const symbol = ref('ETHUSDT')
const direction = ref<GridDirection>('LONG')
const initialAmount = ref('0.01')
const gridOrdersCount = ref(10)
const gridStepPercent = ref('5')
const volumeMode = ref<VolumeMode>('linear')
const startPrice = ref('')
const autoRestart = ref(false)
const botType = ref<BotType>('GRID_FUTURES')
const leverage = ref(10)
const currentPrice = ref('')
const totalBalance = ref('')

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
  if (!payload || !createFormRef.value?.applyPayload(payload, apiKeys.value)) {
    formError.value = t('bots.creation_history_clone_error')
    return
  }

  clonedFromId.value = item.id
  liquidationCheckRef.value?.clearResult()
  createFormRef.value.scrollIntoView()
}

async function handleBotCreated() {
  await loadCreationHistory()
  clonedFromId.value = null
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

      <UCard v-else-if="!apiKeys.length" class="empty-keys-card text-center">
        <p class="empty-keys-card__desc mb-4">{{ $t('bots.no_api_keys') }}</p>
        <UButton to="/settings#api-keys">
          {{ $t('bots.manage_api_keys') }}
        </UButton>
      </UCard>

      <div v-else class="create-layout">
        <div class="create-main">
          <UAlert v-if="formError" color="error" variant="subtle" :title="formError" class="mb-4" />

          <BotCreateForm
            ref="createFormRef"
            v-model:api-key-id="apiKeyId"
            v-model:bot-type="botType"
            v-model:symbol="symbol"
            v-model:direction="direction"
            v-model:initial-amount="initialAmount"
            v-model:grid-orders-count="gridOrdersCount"
            v-model:grid-step-percent="gridStepPercent"
            v-model:volume-mode="volumeMode"
            v-model:start-price="startPrice"
            v-model:auto-restart="autoRestart"
            :api-keys="apiKeys"
            :show-clone-notice="clonedFromId != null"
            @created="handleBotCreated"
          />

          <BotCreationHistory
            :items="creationHistory"
            :loading="historyLoading"
            :error="historyError"
            :selected-id="clonedFromId"
            @select="cloneFromHistory"
            @retry="loadCreationHistory"
          />
        </div>

        <div class="create-sidebar">
          <BotLiquidationCheck
            ref="liquidationCheckRef"
            v-model:bot-type="botType"
            v-model:symbol="symbol"
            v-model:direction="direction"
            v-model:initial-amount="initialAmount"
            v-model:grid-orders-count="gridOrdersCount"
            v-model:grid-step-percent="gridStepPercent"
            v-model:volume-mode="volumeMode"
            v-model:start-price="startPrice"
            v-model:leverage="leverage"
            v-model:current-price="currentPrice"
            v-model:total-balance="totalBalance"
          />
        </div>
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

.create-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.create-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-keys-card {
  padding: 32px;
}

.empty-keys-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
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
    align-items: stretch;
    gap: 18px;
    margin-bottom: 24px;
  }

  .page-header > :last-child {
    width: 100%;
  }
}
</style>
