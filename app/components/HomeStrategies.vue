<script setup lang="ts">
const strategies = [
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.strategy_grid_futures_title',
    descKey: 'home.strategy_grid_futures_desc',
    badge: 'Futures',
  },
  {
    icon: 'i-lucide-layout-grid',
    titleKey: 'home.strategy_grid_spot_title',
    descKey: 'home.strategy_grid_spot_desc',
    badge: 'Spot',
  },
  {
    icon: 'i-lucide-trending-up',
    titleKey: 'home.strategy_dca_title',
    descKey: 'home.strategy_dca_desc',
    badge: 'DCA',
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    titleKey: 'home.strategy_custom_title',
    descKey: 'home.strategy_custom_desc',
    badge: 'Custom',
  },
] as const
</script>

<template>
  <section class="page-section home-strategies">
    <div class="container">
      <div class="section-header">
        <span class="section-label">{{ $t('home.strategies_title') }}</span>
        <h2 class="section-title">{{ $t('home.strategies_subtitle') }}</h2>
      </div>

      <div class="home-strategies__grid">
        <UCard
          v-for="strategy in strategies"
          :key="strategy.titleKey"
          class="strategy-card"
        >
          <div class="strategy-card__head">
            <span class="strategy-card__icon-wrap">
              <UIcon :name="strategy.icon" class="strategy-card__icon" />
            </span>
            <UBadge color="primary" variant="subtle" :label="strategy.badge" />
          </div>
          <h3 class="strategy-card__title">{{ $t(strategy.titleKey) }}</h3>
          <p class="strategy-card__desc">{{ $t(strategy.descKey) }}</p>
        </UCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: 36px;
}

.home-strategies__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.strategy-card {
  padding: 28px 24px;
}

.strategy-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.strategy-card__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-accent);
  box-shadow: var(--shadow-inset-sm);
}

.strategy-card__icon {
  width: 22px;
  height: 22px;
}

.strategy-card__title {
  margin: 0 0 10px;
  font-size: 1.08rem;
  font-weight: 700;
}

.strategy-card__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.6;
}
</style>
