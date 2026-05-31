<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('bots.public_title'),
  description: () => t('bots.public_subtitle'),
})

const strategies = [
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.strategy_grid_futures_title',
    descKey: 'home.strategy_grid_futures_desc',
    badge: 'Futures',
    available: true,
  },
  {
    icon: 'i-lucide-layout-grid',
    titleKey: 'home.strategy_grid_spot_title',
    descKey: 'home.strategy_grid_spot_desc',
    badge: 'Spot',
    available: false,
  },
  {
    icon: 'i-lucide-trending-up',
    titleKey: 'home.strategy_dca_title',
    descKey: 'home.strategy_dca_desc',
    badge: 'DCA',
    available: false,
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    titleKey: 'home.strategy_custom_title',
    descKey: 'home.strategy_custom_desc',
    badge: 'Custom',
    available: false,
  },
] as const

const comingSoon = [
  { icon: 'i-lucide-bell', titleKey: 'bots.public_soon_telegram_title', descKey: 'bots.public_soon_telegram_desc' },
  { icon: 'i-lucide-history', titleKey: 'bots.public_soon_history_title', descKey: 'bots.public_soon_history_desc' },
  { icon: 'i-lucide-shield-alert', titleKey: 'bots.public_soon_liquidation_title', descKey: 'bots.public_soon_liquidation_desc' },
  { icon: 'i-lucide-radio', titleKey: 'bots.public_soon_ws_title', descKey: 'bots.public_soon_ws_desc' },
] as const

const capabilities = [
  'bots.public_capability_1',
  'bots.public_capability_2',
  'bots.public_capability_3',
  'bots.public_capability_4',
] as const
</script>

<template>
  <main class="bots-public">
    <section class="bots-public-hero page-section">
      <div class="container bots-public-hero__inner">
        <span class="section-label">{{ $t('bots.public_badge') }}</span>
        <h1 class="bots-public-hero__title">{{ $t('bots.public_title') }}</h1>
        <p class="bots-public-hero__copy">{{ $t('bots.public_subtitle') }}</p>

        <div class="bots-public-hero__actions">
          <UButton size="lg" to="/auth/register">
            {{ $t('bots.public_cta_register') }}
          </UButton>
          <UButton size="lg" color="neutral" variant="outline" to="/auth/login">
            {{ $t('auth.login') }}
          </UButton>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('bots.public_about_label') }}</span>
          <h2 class="section-title">{{ $t('bots.public_about_title') }}</h2>
          <p class="section-subtitle">{{ $t('bots.public_about_desc') }}</p>
        </div>

        <ul class="bots-public-capabilities">
          <li v-for="key in capabilities" :key="key" class="bots-public-capabilities__item neumo-sm">
            <UIcon name="i-lucide-check-circle-2" class="bots-public-capabilities__icon" />
            <span>{{ $t(key) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="page-section bots-public-strategies">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('home.strategies_title') }}</span>
          <h2 class="section-title">{{ $t('bots.public_strategies_title') }}</h2>
        </div>

        <div class="bots-public-strategies__grid">
          <UCard v-for="strategy in strategies" :key="strategy.titleKey" class="strategy-card">
            <div class="strategy-card__head">
              <span class="strategy-card__icon-wrap">
                <UIcon :name="strategy.icon" class="strategy-card__icon" />
              </span>
              <UBadge
                :color="strategy.available ? 'primary' : 'neutral'"
                variant="subtle"
                :label="strategy.available ? $t('exchanges.status_active') : $t('exchanges.status_soon')"
              />
            </div>
            <h3 class="strategy-card__title">{{ $t(strategy.titleKey) }}</h3>
            <p class="strategy-card__desc">{{ $t(strategy.descKey) }}</p>
          </UCard>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('exchanges.title') }}</span>
          <h2 class="section-title">{{ $t('bots.public_exchanges_title') }}</h2>
          <p class="section-subtitle">{{ $t('bots.public_exchanges_desc') }}</p>
        </div>

        <div class="grid-2cols">
          <ExchangeCard
            name="Binance"
            :description="$t('exchanges.binance_desc')"
            icon="&#11088;"
            :active="true"
            to="/auth/register"
          />
          <ExchangeCard
            name="Bybit"
            :description="$t('exchanges.bybit_desc')"
            icon="&#9632;"
            :active="false"
          />
          <ExchangeCard
            name="OKX"
            :description="$t('exchanges.okx_desc')"
            icon="&#9670;"
            :active="true"
            to="/auth/register"
          />
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('bots.public_soon_label') }}</span>
          <h2 class="section-title">{{ $t('bots.public_soon_title') }}</h2>
        </div>

        <div class="bots-public-soon__grid">
          <UCard v-for="item in comingSoon" :key="item.titleKey" class="soon-card">
            <UIcon :name="item.icon" class="soon-card__icon" />
            <h3 class="soon-card__title">{{ $t(item.titleKey) }}</h3>
            <p class="soon-card__desc">{{ $t(item.descKey) }}</p>
          </UCard>
        </div>
      </div>
    </section>

    <section class="page-section bots-public-cta">
      <div class="container">
        <UCard class="bots-public-cta__card text-center">
          <h2 class="bots-public-cta__title">{{ $t('bots.public_cta_title') }}</h2>
          <p class="bots-public-cta__desc">{{ $t('bots.public_cta_desc') }}</p>
          <div class="bots-public-cta__actions">
            <UButton size="lg" to="/auth/register">
              {{ $t('bots.public_cta_register') }}
            </UButton>
          </div>
        </UCard>
      </div>
    </section>
  </main>
</template>

<style scoped>
.bots-public-hero__inner {
  text-align: center;
  max-width: 720px;
}

.bots-public-hero__title {
  margin: 12px 0 16px;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1.15;
  white-space: pre-line;
}

.bots-public-hero__copy {
  margin: 0 auto 28px;
  max-width: 560px;
  color: var(--color-text-muted);
  font-size: 1.05rem;
  line-height: 1.65;
}

.bots-public-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-subtitle {
  margin: 12px auto 0;
  max-width: 640px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.bots-public-capabilities {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bots-public-capabilities__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  font-size: 0.92rem;
  line-height: 1.5;
}

.bots-public-capabilities__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  color: var(--color-accent);
}

.bots-public-strategies__grid,
.bots-public-soon__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.strategy-card,
.soon-card {
  padding: 28px 24px;
  height: 100%;
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

.strategy-card__icon,
.soon-card__icon {
  width: 22px;
  height: 22px;
}

.soon-card__icon {
  margin-bottom: 14px;
  color: var(--color-accent);
}

.strategy-card__title,
.soon-card__title {
  margin: 0 0 10px;
  font-size: 1.08rem;
  font-weight: 700;
}

.strategy-card__desc,
.soon-card__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.6;
}

.bots-public-cta__card {
  padding: 48px 32px;
}

.bots-public-cta__title {
  margin: 0 0 12px;
  font-size: 1.6rem;
}

.bots-public-cta__desc {
  margin: 0 auto 24px;
  max-width: 520px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.bots-public-cta__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
</style>
