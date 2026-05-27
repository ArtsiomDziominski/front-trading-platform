<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('nav.home'),
  description: () => t('home.hero_subtitle'),
})
</script>

<template>
  <main>
    <section class="hero">
      <div class="container hero__inner">
        <span class="section-label">Trading Bot Platform</span>
        <h1 class="hero__title">{{ $t('home.hero_title') }}</h1>
        <p class="hero__copy">{{ $t('home.hero_subtitle') }}</p>
        <div class="hero__actions">
          <NeumoButton variant="primary" size="lg" tag="NuxtLink" to="/bots">
            {{ $t('home.hero_cta') }}
          </NeumoButton>
          <NeumoButton variant="secondary" size="lg" tag="NuxtLink" to="/swagger">
            {{ $t('home.hero_secondary') }}
          </NeumoButton>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('home.features_title') }}</span>
          <h2 class="section-title">{{ $t('home.features_subtitle') }}</h2>
        </div>
        <div class="grid-2cols">
          <FeatureCard
            icon="&#9881;"
            :title="$t('home.feature_1_title')"
            :description="$t('home.feature_1_desc')"
          />
          <FeatureCard
            icon="&#8644;"
            :title="$t('home.feature_2_title')"
            :description="$t('home.feature_2_desc')"
          />
          <FeatureCard
            icon="&#128274;"
            :title="$t('home.feature_3_title')"
            :description="$t('home.feature_3_desc')"
          />
          <FeatureCard
            icon="&#128196;"
            :title="$t('home.feature_4_title')"
            :description="$t('home.feature_4_desc')"
          />
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('home.exchanges_title') }}</span>
          <h2 class="section-title">{{ $t('home.exchanges_subtitle') }}</h2>
        </div>
        <div class="grid-2cols">
          <ExchangeCard
            name="Binance"
            :description="$t('exchanges.binance_desc')"
            icon="&#11088;"
            :active="true"
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
            :active="false"
          />
        </div>
      </div>
    </section>

    <section class="page-section cta-section">
      <div class="container">
        <NeumoCard variant="raised" class="cta-card">
          <h2 class="cta-title">{{ $t('home.cta_title') }}</h2>
          <p class="cta-subtitle">{{ $t('home.cta_subtitle') }}</p>
          <NeumoButton variant="primary" size="lg" tag="NuxtLink" to="/bots">
            {{ $t('home.cta_button') }}
          </NeumoButton>
        </NeumoCard>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hero {
  padding: 64px 0 48px;
}

.hero__inner {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 48px 0 0;
}

.hero__title {
  max-width: 720px;
  margin: 16px 0 0;
  font-size: clamp(2.4rem, 7vw, 4.8rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  white-space: pre-line;
}

.hero__copy {
  max-width: 600px;
  margin: 16px 0 0;
  color: var(--color-text-muted);
  font-size: 1.08rem;
  line-height: 1.7;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.section-header {
  text-align: center;
  margin-bottom: 8px;
}

.cta-section {
  padding-bottom: 80px;
}

.cta-card {
  text-align: center;
  padding: 56px 32px;
}

.cta-title {
  margin: 0 0 12px;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
}

.cta-subtitle {
  margin: 0 0 28px;
  color: var(--color-text-muted);
  font-size: 1.05rem;
}
</style>
