<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('bots.title'),
  description: () => t('bots.subtitle'),
})

const mockBots = [
  {
    id: 1,
    symbol: 'ETHUSDT',
    bot_type: 'GRID_FUTURES',
    lifecycle_status: 'ACTIVE',
    engine_state: 'RUNNING',
    exchange: 'Binance',
    pnl: '+12.45',
  },
  {
    id: 2,
    symbol: 'BTCUSDT',
    bot_type: 'GRID_FUTURES',
    lifecycle_status: 'STOPPED',
    engine_state: 'STOPPED',
    exchange: 'Binance',
    pnl: '-3.21',
  },
  {
    id: 3,
    symbol: 'SOLUSDT',
    bot_type: 'GRID_SPOT',
    lifecycle_status: 'ACTIVE',
    engine_state: 'RUNNING',
    exchange: 'Binance',
    pnl: '+5.78',
  },
]
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

      <div v-if="mockBots.length" class="bots-grid">
        <BotCard v-for="bot in mockBots" :key="bot.id" :bot="bot" />
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
  margin-bottom: 36px;
}

.bots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
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
