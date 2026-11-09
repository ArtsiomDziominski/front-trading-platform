<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate } from '#shared/types/bot'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()

usePageSeo({
  title: () => t('bots.type_recurring_spot'),
  description: () => t('bots.create_subtitle'),
  noindex: true,
})

const formRef = ref<{
  applyPayload: (payload: BotCreate, keys: ApiKeyOut[]) => boolean
  scrollIntoView: () => void
} | null>(null)

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
} = useBotCreatePage('RECURRING_SPOT', {
  applyPayload: (payload, keys) => formRef.value?.applyPayload(payload, keys) ?? false,
  onCloned: () => formRef.value?.scrollIntoView(),
})
</script>

<template>
  <BotCreatePageShell
    :title="$t('bots.type_recurring_spot')"
    :market-label="$t('bots.market_spot')"
    :loading="keysLoading"
    :has-api-keys="apiKeys.length > 0"
  >
    <UAlert v-if="pageError" color="error" variant="subtle" :title="pageError" />

    <BotRecurringSpotForm
      ref="formRef"
      v-model:api-key-id="apiKeyId"
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
  </BotCreatePageShell>
</template>
