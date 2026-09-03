<script setup lang="ts">
definePageMeta({
  middleware: 'bots-auth',
  validate: (route) => /^\d+$/.test(String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)),
})

const route = useRoute()
const { t } = useI18n()
const {
  bots,
  loading,
  error,
  fetchBots,
  subscribeBotsUpdates,
} = useBots()

const botId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  return Number(value)
})

const bot = computed(() => {
  if (!Number.isFinite(botId.value)) return null
  return bots.value.find((item) => item.id === botId.value) ?? null
})

const missing = computed(() => !loading.value && !bot.value)

useSeoMeta({
  title: () => (bot.value
    ? `${bot.value.symbol} #${bot.value.id}`
    : t('bots.title')),
  description: () => t('bots.subtitle'),
})

let unsubscribeWs: (() => void) | undefined

onMounted(async () => {
  await fetchBots()
  unsubscribeWs = subscribeBotsUpdates()
})

onUnmounted(() => {
  unsubscribeWs?.()
})
</script>

<template>
  <main class="page-section">
    <div class="container bot-detail">
      <div class="page-header">
        <AppButton variant="secondary" size="sm" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </AppButton>
      </div>

      <p v-if="loading && !bot" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error && !bot" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <AppButton variant="secondary" size="sm" @click="() => void fetchBots()">
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <BotCard
        v-else-if="bot"
        :bot="bot"
      />

      <UCard v-else-if="missing" class="empty-state text-center">
        <p class="empty-state__text">{{ $t('bots.stop_loss_not_found') }}</p>
        <div class="empty-state__actions">
          <AppButton to="/bots">
            {{ $t('bots.back_to_bots') }}
          </AppButton>
          <AppButton variant="secondary" :to="`/history?bot_id=${botId}`">
            {{ $t('bots.event_history_open') }}
          </AppButton>
        </div>
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.bot-detail {
  max-width: 720px;
}

.page-header {
  display: flex;
  margin-bottom: 24px;
}

.state-message {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.state-message--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-danger);
}

.empty-state {
  padding: 32px;
}

.empty-state__text {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
</style>
