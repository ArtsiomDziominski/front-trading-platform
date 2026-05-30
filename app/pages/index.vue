<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()

const settingsLink = computed(() =>
  auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
)

const heroStats = [
  { icon: 'i-lucide-building-2', labelKey: 'home.hero_stat_exchanges' },
  { icon: 'i-lucide-layers', labelKey: 'home.hero_stat_strategies' },
  { icon: 'i-lucide-radio', labelKey: 'home.hero_stat_realtime' },
] as const

const primaryCta = computed(() =>
  auth.loggedIn.value
    ? { label: t('home.hero_cta_bots'), to: '/bots' }
    : { label: t('home.hero_cta'), to: '/auth/register' },
)

useSeoMeta({
  title: () => t('nav.home'),
  description: () => t('home.hero_subtitle'),
})
</script>

<template>
  <main class="home">
    <section class="hero">
      <div class="hero__bg" aria-hidden="true" />
      <div class="container hero__inner">
        <span class="section-label">{{ $t('home.hero_badge') }}</span>
        <h1 class="hero__title">{{ $t('home.hero_title') }}</h1>
        <p class="hero__copy">{{ $t('home.hero_subtitle') }}</p>

        <div class="hero__actions">
          <UButton size="lg" :to="primaryCta.to">
            {{ primaryCta.label }}
          </UButton>
          <UButton size="lg" color="neutral" variant="outline" to="/swagger">
            {{ $t('home.hero_secondary') }}
          </UButton>
          <UButton
            v-if="!auth.loggedIn.value"
            size="lg"
            color="neutral"
            variant="ghost"
            to="/auth/login"
          >
            {{ $t('home.cta_login') }}
          </UButton>
        </div>

        <ul class="hero__stats">
          <li v-for="stat in heroStats" :key="stat.labelKey" class="hero__stat neumo-sm">
            <UIcon :name="stat.icon" class="hero__stat-icon" />
            <span>{{ $t(stat.labelKey) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <HomeMarketStrip />

    <HomeSteps />

    <section class="page-section">
      <div class="container">
        <div class="section-header">
          <span class="section-label">{{ $t('home.features_title') }}</span>
          <h2 class="section-title">{{ $t('home.features_subtitle') }}</h2>
        </div>
        <div class="grid-2cols">
          <FeatureCard
            icon-name="i-lucide-sparkles"
            :title="$t('home.feature_1_title')"
            :description="$t('home.feature_1_desc')"
          />
          <FeatureCard
            icon-name="i-lucide-globe"
            :title="$t('home.feature_2_title')"
            :description="$t('home.feature_2_desc')"
          />
          <FeatureCard
            icon-name="i-lucide-shield"
            :title="$t('home.feature_3_title')"
            :description="$t('home.feature_3_desc')"
          />
          <FeatureCard
            icon-name="i-lucide-book-open"
            :title="$t('home.feature_4_title')"
            :description="$t('home.feature_4_desc')"
          />
        </div>
      </div>
    </section>

    <HomeStrategies />

    <HomePlatformModules />

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
            :to="settingsLink"
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
            :to="settingsLink"
          />
        </div>
      </div>
    </section>

    <section class="page-section cta-section">
      <div class="container">
        <UCard class="cta-card neumo">
          <div class="cta-card__glow" aria-hidden="true" />
          <h2 class="cta-title">{{ $t('home.cta_title') }}</h2>
          <p class="cta-subtitle">{{ $t('home.cta_subtitle') }}</p>
          <div class="cta-card__actions">
            <UButton size="lg" :to="auth.loggedIn.value ? '/bots/create' : '/auth/register'">
              {{ $t('home.cta_button') }}
            </UButton>
            <UButton
              v-if="!auth.loggedIn.value"
              size="lg"
              color="neutral"
              variant="outline"
              to="/auth/login"
            >
              {{ $t('home.cta_login') }}
            </UButton>
          </div>
        </UCard>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  overflow: hidden;
}

.hero {
  position: relative;
  padding: 72px 0 24px;
}

.hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgb(18 168 122 / 18%), transparent 60%),
    radial-gradient(ellipse 50% 40% at 90% 20%, rgb(18 168 122 / 8%), transparent 50%);
  pointer-events: none;
}

.hero__inner {
  position: relative;
  display: grid;
  place-items: center;
  text-align: center;
}

.hero__title {
  max-width: 760px;
  margin: 16px 0 0;
  font-size: clamp(2.4rem, 7vw, 4.8rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  white-space: pre-line;
}

.hero__copy {
  max-width: 640px;
  margin: 20px 0 0;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.hero__stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 40px 0 0;
  padding: 0;
  list-style: none;
}

.hero__stat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.hero__stat-icon {
  width: 16px;
  height: 16px;
  color: var(--color-accent);
}

.section-header {
  text-align: center;
  margin-bottom: 36px;
}

.cta-section {
  padding-bottom: 80px;
}

.cta-card {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: 64px 32px;
}

.cta-card__glow {
  position: absolute;
  top: -40%;
  left: 50%;
  width: 480px;
  height: 480px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgb(18 168 122 / 12%), transparent 70%);
  pointer-events: none;
}

.cta-title {
  position: relative;
  margin: 0 0 12px;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
}

.cta-subtitle {
  position: relative;
  margin: 0 0 28px;
  color: var(--color-text-muted);
  font-size: 1.05rem;
}

.cta-card__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 640px) {
  .hero {
    padding-top: 48px;
  }

  .hero__stats {
    flex-direction: column;
    align-items: stretch;
  }

  .hero__stat {
    justify-content: center;
  }
}
</style>
