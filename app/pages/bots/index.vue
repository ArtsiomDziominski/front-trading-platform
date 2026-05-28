<script setup lang="ts">
import type { BotLifecycleStatus } from '#shared/types/bot'

definePageMeta({
  middleware: 'auth',
})

type BotFilterKey = 'all' | 'active' | 'stopped' | 'closed'

const FILTER_STATUSES: Record<Exclude<BotFilterKey, 'all'>, BotLifecycleStatus[]> = {
  active: ['ACTIVE'],
  stopped: ['STOPPED'],
  closed: ['CLOSED'],
}

const { t } = useI18n()
const { bots, loading, error, fetchBots, subscribeBotsUpdates } = useBots()

let unsubscribeWs: (() => void) | undefined

const filter = ref<BotFilterKey>('all')

const filterOptions: { key: BotFilterKey, labelKey: string }[] = [
  { key: 'all', labelKey: 'bots.filter_all' },
  { key: 'active', labelKey: 'bots.filter_active' },
  { key: 'stopped', labelKey: 'bots.filter_stopped' },
  { key: 'closed', labelKey: 'bots.filter_closed' },
]

useSeoMeta({
  title: () => t('bots.title'),
  description: () => t('bots.subtitle'),
})

function loadBots() {
  const statuses = filter.value === 'all' ? undefined : FILTER_STATUSES[filter.value]
  return fetchBots(statuses)
}

watch(filter, () => {
  loadBots()
})

onMounted(async () => {
  await loadBots()
  unsubscribeWs = subscribeBotsUpdates()
})

onUnmounted(() => {
  unsubscribeWs?.()
})
</script>

<template>
  <main class="page-section">
    <div class="container">
      <div class="page-header">
        <div>
          <span class="section-label">{{ $t('bots.title') }}</span>
          <h1 class="section-title">{{ $t('bots.subtitle') }}</h1>
        </div>
        <NeumoButton variant="primary" tag="NuxtLink" to="/bots/create">
          + {{ $t('bots.create_bot') }}
        </NeumoButton>
      </div>

      <div class="bots-filters" role="tablist" :aria-label="$t('bots.filter_label')">
        <button
          v-for="option in filterOptions"
          :key="option.key"
          type="button"
          role="tab"
          class="bots-filters__btn"
          :class="{ 'bots-filters__btn--active': filter === option.key }"
          :aria-selected="filter === option.key"
          @click="filter = option.key"
        >
          {{ $t(option.labelKey) }}
        </button>
      </div>

      <p v-if="loading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <NeumoButton variant="secondary" size="sm" @click="loadBots">
          {{ $t('common.retry') }}
        </NeumoButton>
      </div>

      <div v-else-if="bots.length" class="bots-grid">
        <BotCard v-for="bot in bots" :key="bot.id" :bot="bot" />
      </div>

      <div v-else class="empty-state neumo">
        <p>{{ $t('bots.no_bots') }}</p>
        <NeumoButton variant="primary" tag="NuxtLink" to="/bots/create">
          {{ $t('bots.create_first') }}
        </NeumoButton>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.bots-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.bots-filters__btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, box-shadow 0.15s;
}

.bots-filters__btn:hover {
  color: var(--color-text);
}

.bots-filters__btn--active {
  color: var(--color-accent);
  box-shadow: var(--shadow-inset-sm);
}

.bots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.state-message--error {
  color: var(--color-danger);
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 16px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
