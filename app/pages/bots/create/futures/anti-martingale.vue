<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate } from '#shared/types/bot'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('bots.type_anti_martingale_futures'),
  description: () => t('bots.create_subtitle'),
})

const formRef = ref<{
  applyPayload: (payload: BotCreate, keys: ApiKeyOut[]) => boolean
  scrollIntoView: () => void
} | null>(null)

const {
  bots,
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
} = useBotCreatePage('ANTI_MARTINGALE_FUTURES', {
  applyPayload: (payload, keys) => formRef.value?.applyPayload(payload, keys) ?? false,
  onCloned: () => formRef.value?.scrollIntoView(),
  // The form refuses a second anti-martingale bot on the same symbol
  loadBots: true,
})
</script>

<template>
  <BotCreatePageShell
    :title="$t('bots.type_anti_martingale_futures')"
    :market-label="$t('bots.market_futures')"
    :loading="keysLoading"
    :has-api-keys="apiKeys.length > 0"
  >
    <UAlert v-if="pageError" color="error" variant="subtle" :title="pageError" />

    <BotAntiMartingaleForm
      ref="formRef"
      v-model:api-key-id="apiKeyId"
      :api-keys="apiKeys"
      :existing-bots="bots"
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
  </BotCreatePageShell>
</template>
