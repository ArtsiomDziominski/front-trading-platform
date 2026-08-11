<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()

useHomeSmoothScroll()

const trackRef = useTemplateRef<HTMLElement>('trackRef')
const { progress } = useHomeHeroScroll(trackRef)

const primaryCta = computed(() =>
  auth.loggedIn.value
    ? { label: t('home.hero_cta_bots'), to: '/bots' }
    : { label: t('home.hero_cta'), to: '/auth/register' },
)

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/**
 * Opacity envelope along sticky-hero progress.
 * Visible in [start, end); fully opaque in [peakStart, peakEnd].
 * At progress=0 with start=0 stays visible (important for first paint).
 */
function fadeWindow(start: number, peakStart: number, peakEnd: number, end: number) {
  const p = progress.value
  if (p < start || p >= end) return 0
  if (p >= peakStart && p <= peakEnd) return 1
  if (p < peakStart) {
    const span = peakStart - start
    return span <= 0 ? 1 : clamp01((p - start) / span)
  }
  const span = end - peakEnd
  return span <= 0 ? 1 : clamp01(1 - (p - peakEnd) / span)
}

const titleOpacity = computed(() => fadeWindow(0, 0, 0.22, 0.38))
const titleScale = computed(() => 1 - Math.min(progress.value, 0.32) * 0.28)
const ctaOpacity = computed(() => fadeWindow(0, 0, 0.16, 0.3))
const phoneOpacity = computed(() => fadeWindow(0.1, 0.22, 0.42, 0.58))
const phoneScale = computed(() => 0.84 + Math.min(Math.max(progress.value - 0.1, 0), 0.28) * 0.6)
const secondaryOpacity = computed(() => fadeWindow(0.46, 0.54, 0.64, 0.76))
const bentoOpacity = computed(() => fadeWindow(0.62, 0.74, 1.1, 1.2))
const bentoY = computed(() => 56 * (1 - bentoOpacity.value))
const heroBgBlend = computed(() => clamp01(progress.value / 0.5))

const heroBento = computed(() => [
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.strategy_grid_futures_title',
    captionKey: 'home.tile_futures',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    tone: 'a',
  },
  {
    icon: 'i-lucide-arrow-left-right',
    titleKey: 'home.strategy_grid_spot_title',
    captionKey: 'home.tile_spot',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    tone: 'b',
  },
  {
    icon: 'i-lucide-trending-up',
    titleKey: 'home.strategy_dca_title',
    captionKey: 'home.tile_dca',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    tone: 'c',
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    titleKey: 'home.strategy_custom_title',
    captionKey: 'home.tile_custom',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    tone: 'd',
  },
])

useSeoMeta({
  title: () => t('nav.home'),
  description: () => t('home.hero_subtitle'),
})
</script>

<template>
  <main class="mm-home">
    <HomePromoBanner />

    <div
      ref="trackRef"
      class="hero-track"
    >
      <div class="hero-sticky">
        <div
          class="hero-bg"
          :style="{ opacity: String(0.4 + heroBgBlend * 0.4) }"
          aria-hidden="true"
        />
        <div
          class="hero-bg-glow"
          aria-hidden="true"
        />

        <div
          class="hero-title"
          :style="{
            opacity: String(titleOpacity),
            transform: `scale(${titleScale})`,
          }"
        >
          <h1>
            <span>{{ $t('home.hero_title_line1') }}</span>
            <span>
              {{ $t('home.hero_title_before_em') }}<i>{{ $t('home.hero_title_em') }}</i>{{ $t('home.hero_title_after_em') }}
            </span>
            <span>{{ $t('home.hero_title_line3') }}</span>
          </h1>
        </div>

        <div
          class="hero-cta-wrap"
          :style="{ opacity: String(ctaOpacity), pointerEvents: ctaOpacity > 0.2 ? 'auto' : 'none' }"
        >
          <AppButton
            size="lg"
            :to="primaryCta.to"
          >
            {{ primaryCta.label }}
          </AppButton>
          <p class="hero-cta-note">
            {{ $t('home.hero_subtitle') }}
          </p>
        </div>

        <div
          class="hero-phone"
          :style="{
            opacity: String(phoneOpacity),
            transform: `translate(-50%, -50%) scale(${phoneScale})`,
          }"
        >
          <HomePhoneMock />
        </div>

        <h2
          class="hero-secondary"
          :style="{ opacity: String(secondaryOpacity) }"
        >
          {{ $t('home.strategies_title') }}
        </h2>

        <div
          class="hero-bento"
          :style="{
            opacity: String(bentoOpacity),
            transform: `translateY(${bentoY}px)`,
            pointerEvents: bentoOpacity > 0.3 ? 'auto' : 'none',
          }"
        >
          <NuxtLink
            v-for="tile in heroBento"
            :key="tile.captionKey"
            :to="tile.to"
            class="hero-bento__card"
            :class="`hero-bento__card--${tile.tone}`"
          >
            <div class="hero-bento__art">
              <div class="hero-bento__shape" />
              <UIcon
                :name="tile.icon"
                class="hero-bento__icon"
              />
            </div>
            <div class="hero-bento__body">
              <h3>{{ $t(tile.titleKey) }}</h3>
              <p>{{ $t(tile.captionKey) }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <ScrollReveal>
      <HomeMarketStrip />
    </ScrollReveal>

    <ScrollReveal>
      <HomeStrategies />
    </ScrollReveal>

    <ScrollReveal>
      <HomePlatformModules />
    </ScrollReveal>

    <ScrollReveal>
      <HomeSecurityHub />
    </ScrollReveal>

    <ScrollReveal>
      <HomeTrustMetrics />
    </ScrollReveal>

    <ScrollReveal>
      <HomeExchanges />
    </ScrollReveal>

    <ScrollReveal :distance="36">
      <section class="mm-cta">
        <div
          class="mm-cta__bg"
          aria-hidden="true"
        />
        <div class="container mm-cta__inner">
          <h2>{{ $t('home.cta_title') }}</h2>
          <p class="mm-cta__subtitle">
            {{ $t('home.cta_subtitle') }}
          </p>
          <div class="mm-cta__actions">
            <AppButton
              size="lg"
              :to="auth.loggedIn.value ? '/bots/create' : '/auth/register'"
            >
              {{ $t('home.cta_button') }}
            </AppButton>
            <AppButton
              v-if="!auth.loggedIn.value"
              variant="secondary"
              size="lg"
              to="/auth/login"
            >
              {{ $t('home.cta_login') }}
            </AppButton>
          </div>
          <p class="mm-cta__note">
            {{ $t('home.cta_note') }}
          </p>
        </div>
      </section>
    </ScrollReveal>

    <ScrollReveal>
      <HomeSteps />
    </ScrollReveal>
  </main>
</template>

<style scoped>
.mm-home {
  --mm-green-dark: #013330;
  --mm-green: #baf24a;
  --mm-green-light: #e5ffc3;
  --mm-blue-light: #cee9fd;
  overflow: clip;
  background: var(--mm-green-light);
  color: var(--mm-green-dark);
}

.hero-track {
  height: 480vh;
}

.hero-sticky {
  position: sticky;
  top: 0;
  isolation: isolate;
  overflow: hidden;
  height: 100svh;
  color: var(--mm-green-light);
  background: var(--mm-green-dark);
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, var(--mm-blue-light), transparent 60%),
    linear-gradient(160deg, #025c56 0%, var(--mm-green-dark) 55%, #012421 100%);
  animation: heroShift 14s ease-in-out infinite alternate;
}

.hero-bg-glow {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    radial-gradient(circle at 30% 20%, rgb(186 242 74 / 28%), transparent 35%),
    radial-gradient(circle at 70% 70%, rgb(206 233 253 / 35%), transparent 40%);
  pointer-events: none;
}

@keyframes heroShift {
  from { filter: hue-rotate(0deg) saturate(1); }
  to { filter: hue-rotate(12deg) saturate(1.15); }
}

.hero-title {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  will-change: transform, opacity;
}

.hero-title h1 {
  display: flex;
  flex-direction: column;
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(3.2rem, 11vw, 8.5rem);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: -0.03em;
  text-align: center;
  color: var(--mm-green-light);
}

.hero-title i {
  font-style: italic;
  color: var(--mm-green);
}

.hero-cta-wrap {
  position: absolute;
  z-index: 20;
  top: calc(60% + clamp(6.5rem, 17vh, 11.5rem));
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 12px;
  width: min(92vw, 420px);
  transform: translateX(-50%);
  will-change: opacity;
}

.hero-cta-note {
  margin: 0;
  color: rgb(229 255 195 / 78%);
  font-size: 0.92rem;
  line-height: 1.45;
  text-align: center;
}

.hero-phone {
  position: absolute;
  z-index: 15;
  top: 52%;
  left: 50%;
  width: min(340px, 78vw);
  will-change: transform, opacity;
}

.hero-secondary {
  position: absolute;
  z-index: 18;
  top: 50%;
  left: 50%;
  width: min(90%, 16ch);
  margin: 0;
  transform: translate(-50%, -50%);
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(2.4rem, 7vw, 4.8rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-align: center;
  color: var(--mm-green-light);
  white-space: pre-line;
  pointer-events: none;
  will-change: opacity;
}

.hero-bento {
  position: absolute;
  z-index: 22;
  inset: auto 3% 5%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 1180px;
  margin: 0 auto;
  will-change: transform, opacity;
}

.hero-bento__card {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 190px;
  overflow: hidden;
  border-radius: 24px;
  background: var(--mm-green-light);
  color: var(--mm-green-dark);
  text-decoration: none;
}

.hero-bento__art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 112px;
  overflow: hidden;
}

.hero-bento__shape {
  position: absolute;
  width: 46%;
  height: 58%;
  border-radius: 18px;
  rotate: -12deg;
  background: rgb(1 51 48 / 12%);
}

.hero-bento__card--a .hero-bento__art {
  background: linear-gradient(160deg, #baf24a, #7bcf3a);
}

.hero-bento__card--b .hero-bento__art {
  background: linear-gradient(160deg, #cce7ff, #7eb8ff);
}

.hero-bento__card--c .hero-bento__art {
  background: linear-gradient(160deg, #e5ffc3, #baf24a);
}

.hero-bento__card--d .hero-bento__art {
  background: linear-gradient(160deg, #ffd9a8, #f5a623);
}

.hero-bento__icon {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  color: var(--mm-green-dark);
}

.hero-bento__body {
  display: grid;
  gap: 4px;
  padding: 12px 14px 14px;
}

.hero-bento__body h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
}

.hero-bento__body p {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(1 51 48 / 78%);
}

.mm-cta {
  position: relative;
  overflow: hidden;
  padding: 110px 0;
  background: var(--mm-green-dark);
  color: var(--mm-green-light);
}

.mm-cta__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 80% at 50% 100%, rgb(186 242 74 / 22%), transparent 55%),
    radial-gradient(ellipse 40% 50% at 15% 20%, rgb(206 233 253 / 18%), transparent 50%);
}

.mm-cta__inner {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 18px;
  text-align: center;
}

.mm-cta h2 {
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(3rem, 9vw, 5.5rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.mm-cta__subtitle {
  max-width: 42ch;
  margin: 0;
  color: rgb(229 255 195 / 78%);
  font-size: 1.08rem;
  line-height: 1.5;
}

.mm-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
}

.mm-cta__note {
  margin: 4px 0 0;
  color: rgb(229 255 195 / 58%);
  font-size: 0.88rem;
}

@media (max-width: 768px) {
  .hero-track {
    height: 400vh;
  }

  .hero-bento {
    inset: auto 2% 3%;
    gap: 8px;
  }

  .hero-bento__card {
    min-height: 150px;
  }

  .hero-cta-note {
    display: none;
  }
}

@media (min-width: 900px) {
  .hero-bento {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    inset: auto 4% 7%;
  }

  .hero-bento__card {
    min-height: 260px;
  }

  .hero-bento__art {
    min-height: 140px;
  }

  .hero-bento__body h3 {
    font-size: 1.05rem;
  }

  .hero-bento__body p {
    font-size: 0.86rem;
  }
}
</style>
