<script setup lang="ts">
const POLL_INTERVAL_MS = 60_000

const route = useRoute()
const { market, status, error, refresh } = useMarketSummary()

function isHomeRoute(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return normalized === '/' || normalized === '/en'
}

function changeClass(change: string): string {
  if (change.startsWith('+') && change !== '+0.00%') return 'market-card__change--up'
  if (change.startsWith('-')) return 'market-card__change--down'
  return 'market-card__change--flat'
}

let pollTimer: ReturnType<typeof setInterval> | undefined

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function startPolling() {
  stopPolling()

  if (!import.meta.client || !isHomeRoute(route.path) || document.hidden) {
    return
  }

  pollTimer = setInterval(() => {
    if (isHomeRoute(route.path) && !document.hidden) {
      void refresh()
    }
  }, POLL_INTERVAL_MS)
}

function syncPolling() {
  if (isHomeRoute(route.path)) {
    startPolling()
  } else {
    stopPolling()
  }
}

onMounted(() => {
  syncPolling()
  document.addEventListener('visibilitychange', syncPolling)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', syncPolling)
})

watch(() => route.path, syncPolling)
</script>

<template>
  <section class="market-strip" aria-label="Market summary">
    <div class="container">
      <div class="market-strip__header">
        <div>
          <span class="section-label">{{ $t('home.market_title') }}</span>
          <h2 class="market-strip__title">{{ $t('home.market_subtitle') }}</h2>
          <p class="market-strip__source">{{ $t('home.market_source') }}</p>
        </div>
        <span v-if="status === 'pending'" class="market-strip__status">{{ $t('common.loading') }}</span>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="$t('home.market_error')"
        class="market-strip__error"
      >
        <template #description>
          <UButton size="xs" color="neutral" variant="outline" @click="() => refresh()">
            {{ $t('common.retry') }}
          </UButton>
        </template>
      </UAlert>

      <div v-else class="market-strip__grid">
        <UCard
          v-for="item in market"
          :key="item.symbol"
          class="market-card"
        >
          <div class="market-card__top">
            <span class="market-card__symbol">{{ item.symbol }}</span>
            <span
              class="market-card__change"
              :class="changeClass(item.change)"
            >
              {{ item.change }}
            </span>
          </div>
          <p class="market-card__name">{{ item.name }}</p>
          <p class="market-card__price">${{ item.price }}</p>
        </UCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.market-strip {
  padding: 32px 0 48px;
}

.market-strip__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.market-strip__title {
  margin: 0;
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  font-weight: 700;
}

.market-strip__source {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.market-strip__status {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.market-strip__error {
  margin-bottom: 8px;
}

.market-strip__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.market-card {
  padding: 20px;
}

.market-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.market-card__symbol {
  font-size: 0.95rem;
  font-weight: 700;
}

.market-card__change {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.market-card__change--up {
  color: var(--color-accent);
  background: var(--color-accent-dim);
}

.market-card__change--down {
  color: var(--color-danger);
  background: rgb(225 29 72 / 10%);
}

.market-card__change--flat {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}

.market-card__name {
  margin: 0 0 10px;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.market-card__price {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
</style>
