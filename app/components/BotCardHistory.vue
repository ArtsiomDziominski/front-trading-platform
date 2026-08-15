<script setup lang="ts">
const props = defineProps<{
  botId: number
}>()

const {
  events,
  loading,
  loadingMore,
  clearing,
  error,
  hasMore,
  load,
  loadMore,
  clear,
} = useBotEventHistory()

const open = ref(false)
const confirmOpen = ref(false)
const historyLink = computed(() => `/history?bot_id=${props.botId}`)

const filters = computed(() => ({ bot_id: props.botId }))

async function loadFeed() {
  await load(filters.value)
}

watch(open, (isOpen) => {
  if (isOpen) loadFeed()
})

watch(() => props.botId, () => {
  if (open.value) loadFeed()
})

function reloadIfOpen() {
  if (open.value) loadFeed()
}

async function confirmClear() {
  try {
    await clear(filters.value)
    confirmOpen.value = false
  } catch {
    confirmOpen.value = false
  }
}

defineExpose({ reloadIfOpen })
</script>

<template>
  <div class="bot-history">
    <div class="bot-history__toolbar">
      <AppButton
        variant="secondary"
        size="sm"
        :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        @click="open = !open"
      >
        {{ $t('bots.event_history_open') }}
      </AppButton>
      <AppButton
        v-if="open"
        variant="secondary"
        size="sm"
        :to="historyLink"
      >
        {{ $t('nav.history') }}
      </AppButton>
    </div>

    <div
      v-if="open"
      class="bot-history__body"
    >
      <p
        v-if="loading && !events.length"
        class="bot-history__state"
        role="status"
      >
        {{ $t('common.loading') }}
      </p>

      <div
        v-else-if="error && !events.length"
        class="bot-history__state bot-history__state--error"
        role="alert"
      >
        <p>{{ error }}</p>
        <AppButton
          variant="secondary"
          size="sm"
          @click="loadFeed"
        >
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <template v-else-if="events.length">
        <BotEventFeed
          :events="events"
          compact
        />
        <div class="bot-history__actions">
          <AppButton
            v-if="hasMore"
            variant="secondary"
            size="sm"
            :loading="loadingMore"
            @click="loadMore()"
          >
            {{ $t('bots.event_history_load_more') }}
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            :disabled="clearing || loading"
            @click="confirmOpen = true"
          >
            {{ $t('bots.event_history_clear') }}
          </AppButton>
        </div>
      </template>

      <p
        v-else
        class="bot-history__state"
      >
        {{ $t('bots.event_history_empty') }}
      </p>
    </div>

    <ConfirmModal
      v-model="confirmOpen"
      :title="$t('bots.event_history_clear_title')"
      :message="$t('bots.event_history_clear_confirm_filtered')"
      :confirm-label="$t('bots.event_history_clear')"
      :cancel-label="$t('common.cancel')"
      :loading-label="$t('common.loading')"
      :loading="clearing"
      confirm-variant="danger"
      @confirm="confirmClear"
    />
  </div>
</template>

<style scoped>
.bot-history {
  position: relative;
  z-index: 1;
  margin-top: 18px;
}

.bot-history__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bot-history__body {
  margin-top: 12px;
}

.bot-history__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.bot-history__state {
  margin: 0;
  color: var(--color-on-surface-muted);
  font-size: 0.85rem;
}

.bot-history__state--error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  color: var(--color-danger);
}
</style>
