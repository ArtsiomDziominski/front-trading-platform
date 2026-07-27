<script setup lang="ts">
const POLL_INTERVAL_MS = 60_000

const route = useRoute()
const { market, status, error, refresh } = useMarketSummary()

function isHomeRoute(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return normalized === '/' || normalized === '/en'
}

function changeClass(change: string): string {
  if (change.startsWith('+') && change !== '+0.00%') return 'is-up'
  if (change.startsWith('-')) return 'is-down'
  return 'is-flat'
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
  if (isHomeRoute(route.path)) startPolling()
  else stopPolling()
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
  <section
    class="market"
    aria-label="Market summary"
  >
    <div class="container">
      <header class="market__header">
        <div>
          <h2>{{ $t('home.market_title') }}</h2>
          <p>{{ $t('home.market_subtitle') }}</p>
        </div>
        <span
          v-if="status === 'pending'"
          class="market__status"
        >
          {{ $t('common.loading') }}
        </span>
      </header>

      <div
        v-if="!error"
        class="market__grid"
      >
        <article
          v-for="item in market"
          :key="item.symbol"
          class="market-card"
        >
          <div class="market-card__top">
            <span class="market-card__name">{{ item.name }}</span>
            <span
              class="market-card__change"
              :class="changeClass(item.change)"
            >
              {{ item.change }}
            </span>
          </div>
          <p class="market-card__price">${{ item.price }}</p>
          <span class="market-card__symbol">{{ item.symbol }}</span>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.market {
  padding: 72px 0 40px;
  background: #e5ffc3;
  color: #013330;
}

.market__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 24px;
}

.market__header h2 {
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 400;
  line-height: 1;
}

.market__header p {
  margin: 10px 0 0;
  color: rgb(1 51 48 / 68%);
  font-size: 1.02rem;
}

.market__status {
  color: rgb(1 51 48 / 55%);
  font-size: 0.85rem;
  font-weight: 650;
}

.market__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.market-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 22px;
  background: #013330;
  color: #e5ffc3;
}

.market-card__top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.market-card__name {
  font-weight: 800;
}

.market-card__change {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 750;
}

.market-card__change.is-up {
  background: rgb(186 242 74 / 18%);
  color: #baf24a;
}

.market-card__change.is-down {
  background: rgb(251 113 133 / 18%);
  color: #fb7185;
}

.market-card__change.is-flat {
  background: rgb(229 255 195 / 10%);
  color: rgb(229 255 195 / 70%);
}

.market-card__price {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.market-card__symbol {
  color: rgb(229 255 195 / 55%);
  font-size: 0.78rem;
  font-weight: 650;
}

@media (min-width: 900px) {
  .market__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
