<script setup lang="ts">
const { t } = useI18n()

useHomeSmoothScroll()
useSeoMeta({
  title: () => t('bots.public_title'),
  description: () => t('bots.public_subtitle'),
})

const trackRef = useTemplateRef<HTMLElement>('trackRef')
const { progress } = useHomeHeroScroll(trackRef)

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/** Opacity envelope along sticky progress. Visible in [start, end). */
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

function sceneStyle(start: number, peakStart: number, peakEnd: number, end: number) {
  const opacity = fadeWindow(start, peakStart, peakEnd, end)
  const rise = (1 - opacity) * 28
  return {
    opacity: String(opacity),
    transform: `translateY(${rise}px) scale(${0.97 + opacity * 0.03})`,
    pointerEvents: opacity > 0.35 ? 'auto' as const : 'none' as const,
  }
}

const scenes = [
  { id: 'hero', start: 0, peakStart: 0, peakEnd: 0.12, end: 0.2 },
  { id: 'about', start: 0.14, peakStart: 0.2, peakEnd: 0.3, end: 0.38 },
  { id: 'strategies', start: 0.32, peakStart: 0.38, peakEnd: 0.48, end: 0.56 },
  { id: 'exchanges', start: 0.5, peakStart: 0.56, peakEnd: 0.66, end: 0.74 },
  { id: 'soon', start: 0.68, peakStart: 0.74, peakEnd: 0.84, end: 0.9 },
  { id: 'cta', start: 0.84, peakStart: 0.9, peakEnd: 1.1, end: 1.2 },
] as const

const activeScene = computed(() => {
  const p = progress.value
  let best = 0
  let bestOpacity = -1
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]!
    const o = fadeWindow(s.start, s.peakStart, s.peakEnd, s.end)
    if (o > bestOpacity) {
      bestOpacity = o
      best = i
    }
  }
  // keep last scene active near end
  if (p > 0.92) return scenes.length - 1
  return best
})

const strategies = [
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.strategy_grid_futures_title',
    descKey: 'home.strategy_grid_futures_desc',
    available: true,
  },
  {
    icon: 'i-lucide-layout-grid',
    titleKey: 'home.strategy_grid_spot_title',
    descKey: 'home.strategy_grid_spot_desc',
    available: false,
  },
  {
    icon: 'i-lucide-trending-up',
    titleKey: 'home.strategy_dca_title',
    descKey: 'home.strategy_dca_desc',
    available: false,
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    titleKey: 'home.strategy_custom_title',
    descKey: 'home.strategy_custom_desc',
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
  { icon: 'i-lucide-grid-3x3', key: 'bots.public_capability_1' },
  { icon: 'i-lucide-play', key: 'bots.public_capability_2' },
  { icon: 'i-lucide-scroll-text', key: 'bots.public_capability_3' },
  { icon: 'i-lucide-shield-alert', key: 'bots.public_capability_4' },
] as const

const exchanges = [
  { name: 'Binance', exchange: 'BINANCE' as const, active: true, descKey: 'exchanges.binance_desc' },
  { name: 'OKX', exchange: 'OKX' as const, active: true, descKey: 'exchanges.okx_desc' },
  { name: 'Bybit', exchange: 'BYBIT' as const, active: false, descKey: 'exchanges.bybit_desc' },
]
</script>

<template>
  <main class="bots-scale">
    <div
      ref="trackRef"
      class="bots-scale__track"
    >
      <div class="bots-scale__sticky">
        <div
          class="bots-scale__atmosphere"
          aria-hidden="true"
        />

        <div
          class="bots-scale__progress"
          aria-hidden="true"
        >
          <button
            v-for="(scene, index) in scenes"
            :key="scene.id"
            type="button"
            class="bots-scale__dot"
            :class="{ 'is-active': activeScene === index }"
            tabindex="-1"
          />
        </div>

        <!-- Scene 0: Hero -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0, 0, 0.12, 0.2)"
        >
          <div class="bots-scale__shell bots-scale__shell--hero">
            <div class="bots-scale__copy">
              <p class="bots-scale__eyebrow">
                {{ $t('bots.public_badge') }}
              </p>
              <h1>{{ $t('bots.public_title') }}</h1>
              <p class="bots-scale__lead">
                {{ $t('bots.public_subtitle') }}
              </p>
              <div class="bots-scale__actions">
                <AppButton
                  variant="inverse"
                  size="lg"
                  to="/auth/register"
                >
                  {{ $t('bots.public_cta_register') }}
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="lg"
                  to="/auth/login"
                >
                  {{ $t('auth.login') }}
                </AppButton>
              </div>
            </div>
            <div
              class="bots-scale__visual"
              aria-hidden="true"
            >
              <div class="bots-glow bots-glow--violet">
                <div class="bots-mock">
                  <div class="bots-mock__chrome">
                    <div class="bots-mock__dots"><i /><i /><i /></div>
                    <span>Bot dashboard</span>
                    <span class="bots-mock__pill">Live</span>
                  </div>
                  <div
                    v-for="row in ['ETHUSDT +12.4%', 'BTCUSDT +4.8%', 'SOLUSDT +9.1%']"
                    :key="row"
                    class="bots-mock__row"
                  >
                    <span class="bots-mock__status" />
                    <strong>{{ row.split(' ')[0] }}</strong>
                    <em>{{ row.split(' ')[1] }}</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Scene 1: About -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0.14, 0.2, 0.3, 0.38)"
        >
          <div class="bots-scale__shell">
            <header class="bots-scale__header">
              <p class="bots-scale__eyebrow">
                {{ $t('bots.public_about_label') }}
              </p>
              <h2>{{ $t('bots.public_about_title') }}</h2>
              <p class="bots-scale__lead">
                {{ $t('bots.public_about_desc') }}
              </p>
            </header>
            <ul class="bots-caps">
              <li
                v-for="item in capabilities"
                :key="item.key"
              >
                <span class="bots-caps__icon">
                  <UIcon :name="item.icon" />
                </span>
                <span>{{ $t(item.key) }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Scene 2: Strategies -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0.32, 0.38, 0.48, 0.56)"
        >
          <div class="bots-scale__shell">
            <header class="bots-scale__header">
              <h2>{{ $t('bots.public_strategies_title') }}</h2>
            </header>
            <div class="bots-strat">
              <article
                v-for="strategy in strategies"
                :key="strategy.titleKey"
                class="bots-strat__card"
                :class="{ 'is-soon': !strategy.available }"
              >
                <div class="bots-strat__top">
                  <span class="bots-strat__icon">
                    <UIcon :name="strategy.icon" />
                  </span>
                  <span class="bots-strat__badge">
                    {{ strategy.available ? $t('exchanges.status_active') : $t('exchanges.status_soon') }}
                  </span>
                </div>
                <h3>{{ $t(strategy.titleKey) }}</h3>
                <p>{{ $t(strategy.descKey) }}</p>
              </article>
            </div>
          </div>
        </section>

        <!-- Scene 3: Exchanges -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0.5, 0.56, 0.66, 0.74)"
        >
          <div class="bots-scale__shell">
            <header class="bots-scale__header">
              <h2>{{ $t('bots.public_exchanges_title') }}</h2>
              <p class="bots-scale__lead">
                {{ $t('bots.public_exchanges_desc') }}
              </p>
            </header>
            <div class="bots-ex">
              <article
                v-for="item in exchanges"
                :key="item.name"
                class="bots-ex__card"
                :class="{ 'is-soon': !item.active }"
              >
                <ExchangeIcon
                  :exchange="item.exchange"
                  size="compact"
                />
                <div>
                  <h3>{{ item.name }}</h3>
                  <p>{{ $t(item.descKey) }}</p>
                </div>
                <span class="bots-ex__status">
                  {{ item.active ? $t('exchanges.status_active') : $t('exchanges.status_soon') }}
                </span>
              </article>
            </div>
          </div>
        </section>

        <!-- Scene 4: Roadmap -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0.68, 0.74, 0.84, 0.9)"
        >
          <div class="bots-scale__shell">
            <header class="bots-scale__header">
              <p class="bots-scale__eyebrow">
                {{ $t('bots.public_soon_label') }}
              </p>
              <h2>{{ $t('bots.public_soon_title') }}</h2>
            </header>
            <div class="bots-soon">
              <article
                v-for="item in comingSoon"
                :key="item.titleKey"
                class="bots-soon__card"
              >
                <span class="bots-soon__icon">
                  <UIcon :name="item.icon" />
                </span>
                <h3>{{ $t(item.titleKey) }}</h3>
                <p>{{ $t(item.descKey) }}</p>
              </article>
            </div>
          </div>
        </section>

        <!-- Scene 5: CTA -->
        <section
          class="bots-scale__scene"
          :style="sceneStyle(0.84, 0.9, 1.1, 1.2)"
        >
          <div class="bots-scale__shell bots-scale__shell--cta">
            <h2>{{ $t('bots.public_cta_title') }}</h2>
            <p class="bots-scale__lead">
              {{ $t('bots.public_cta_desc') }}
            </p>
            <div class="bots-scale__actions">
              <AppButton
                variant="inverse"
                size="lg"
                to="/auth/register"
              >
                {{ $t('bots.public_cta_register') }}
              </AppButton>
              <AppButton
                variant="ghost"
                size="lg"
                to="/auth/login"
              >
                {{ $t('auth.login') }}
              </AppButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.bots-scale {
  overflow: clip;
  background: #000;
  color: #fff;
  font-family: Inter, "DM Sans", ui-sans-serif, system-ui, sans-serif;
}

.bots-scale__track {
  height: 620vh;
}

.bots-scale__sticky {
  position: sticky;
  top: 0;
  isolation: isolate;
  overflow: hidden;
  height: 100svh;
  background: #000;
}

.bots-scale__atmosphere {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 45% at 75% 35%, rgb(124 58 237 / 22%), transparent 60%),
    radial-gradient(ellipse 40% 40% at 15% 70%, rgb(37 99 235 / 16%), transparent 55%),
    radial-gradient(ellipse 50% 35% at 50% 100%, rgb(14 165 233 / 8%), transparent 50%);
  pointer-events: none;
}

.bots-scale__progress {
  position: absolute;
  z-index: 30;
  top: 50%;
  right: max(16px, calc((100% - 1200px) / 2 - 8px));
  display: grid;
  gap: 10px;
  transform: translateY(-50%);
}

.bots-scale__dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 22%);
  cursor: default;
  transition:
    background 0.35s ease,
    transform 0.35s ease,
    box-shadow 0.35s ease;
}

.bots-scale__dot.is-active {
  transform: scale(1.35);
  background: #c4b5fd;
  box-shadow: 0 0 14px rgb(196 181 253 / 55%);
}

.bots-scale__scene {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  align-items: center;
  will-change: transform, opacity;
  transition: none;
}

.bots-scale__shell {
  width: min(1120px, calc(100% - 56px));
  margin: 0 auto;
  padding: 24px 0;
}

.bots-scale__shell--hero {
  display: grid;
  align-items: center;
  gap: clamp(28px, 5vw, 64px);
}

.bots-scale__shell--cta {
  display: grid;
  justify-items: center;
  gap: 18px;
  text-align: center;
}

.bots-scale__copy,
.bots-scale__header {
  display: grid;
  gap: 16px;
  max-width: 560px;
}

.bots-scale__shell--cta .bots-scale__lead {
  max-width: 42ch;
}

.bots-scale__eyebrow {
  margin: 0;
  color: rgb(196 181 253 / 85%);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bots-scale__copy h1,
.bots-scale__header h2,
.bots-scale__shell--cta h2 {
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.05;
  white-space: pre-line;
}

.bots-scale__copy h1 {
  font-size: clamp(2.4rem, 5.5vw, 4rem);
}

.bots-scale__header h2,
.bots-scale__shell--cta h2 {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
}

.bots-scale__lead {
  margin: 0;
  color: rgb(255 255 255 / 55%);
  font-size: clamp(0.98rem, 1.5vw, 1.12rem);
  line-height: 1.6;
}

.bots-scale__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.bots-scale__shell--cta .bots-scale__actions {
  justify-content: center;
}

.bots-scale__visual {
  min-height: 280px;
}

.bots-glow {
  position: relative;
  --glow: rgb(139 92 246 / 42%);
}

.bots-glow::before {
  content: '';
  position: absolute;
  inset: -16% -10%;
  border-radius: 40%;
  background: radial-gradient(circle, var(--glow), transparent 68%);
  filter: blur(24px);
  pointer-events: none;
}

.bots-glow > .bots-mock {
  position: relative;
  padding: 18px;
  border-radius: 22px;
  background:
    linear-gradient(165deg, rgb(18 18 28 / 96%), rgb(8 8 14 / 98%));
  border: 1px solid rgb(255 255 255 / 10%);
  box-shadow: 0 30px 80px rgb(0 0 0 / 45%);
}

.bots-mock__chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: rgb(255 255 255 / 50%);
  font-size: 0.75rem;
  font-weight: 600;
}

.bots-mock__dots {
  display: flex;
  gap: 5px;
}

.bots-mock__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(255 255 255 / 16%);
}

.bots-mock__pill {
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgb(74 222 128 / 14%);
  color: #4ade80;
  font-size: 0.68rem;
  text-transform: uppercase;
}

.bots-mock__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-top: 8px;
  border-radius: 12px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 6%);
}

.bots-mock__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px rgb(74 222 128 / 55%);
}

.bots-mock__row strong {
  font-size: 0.9rem;
}

.bots-mock__row em {
  font-style: normal;
  color: #4ade80;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.bots-caps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.bots-caps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 8%);
  font-size: 0.92rem;
  line-height: 1.45;
}

.bots-caps__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(145deg, rgb(129 140 248 / 30%), rgb(168 85 247 / 20%));
  color: #c4b5fd;
}

.bots-caps__icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.bots-strat,
.bots-soon {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 28px;
}

.bots-strat__card,
.bots-soon__card {
  padding: 20px;
  border-radius: 18px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 8%);
}

.bots-strat__card.is-soon {
  opacity: 0.72;
}

.bots-strat__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.bots-strat__icon,
.bots-soon__icon {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(129 140 248 / 30%), rgb(168 85 247 / 20%));
  color: #c4b5fd;
}

.bots-strat__icon :deep(svg),
.bots-soon__icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.bots-strat__badge {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(129 140 248 / 16%);
  color: #c4b5fd;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bots-strat__card.is-soon .bots-strat__badge {
  background: rgb(255 255 255 / 8%);
  color: rgb(255 255 255 / 55%);
}

.bots-strat__card h3,
.bots-soon__card h3,
.bots-ex__card h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.bots-soon__icon {
  margin-bottom: 12px;
}

.bots-strat__card p,
.bots-soon__card p,
.bots-ex__card p {
  margin: 0;
  color: rgb(255 255 255 / 50%);
  font-size: 0.88rem;
  line-height: 1.55;
}

.bots-ex {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}

.bots-ex__card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 8%);
}

.bots-ex__card.is-soon {
  opacity: 0.7;
}

.bots-ex__status {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #4ade80;
}

.bots-ex__card.is-soon .bots-ex__status {
  color: rgb(255 255 255 / 45%);
}

@media (min-width: 960px) {
  .bots-scale__shell--hero {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }

  .bots-strat,
  .bots-soon {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .bots-caps {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .bots-scale__track {
    height: 560vh;
  }

  .bots-scale__progress {
    right: 10px;
  }

  .bots-scale__shell {
    width: calc(100% - 40px);
  }

  .bots-scale__visual {
    display: none;
  }

  .bots-caps,
  .bots-strat,
  .bots-soon {
    grid-template-columns: 1fr;
  }

  .bots-ex__card {
    grid-template-columns: auto 1fr;
  }

  .bots-ex__status {
    grid-column: 2;
  }

  .bots-scale__actions {
    width: 100%;
  }

  .bots-scale__actions :deep(a),
  .bots-scale__actions :deep(button) {
    flex: 1;
    justify-content: center;
    min-height: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bots-scale__track {
    height: auto;
  }

  .bots-scale__sticky {
    position: relative;
    height: auto;
    display: grid;
    gap: 72px;
    padding: 48px 0 80px;
  }

  .bots-scale__scene {
    position: relative;
    inset: auto;
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
  }

  .bots-scale__progress {
    display: none;
  }

  .bots-scale__visual {
    display: block;
  }
}
</style>
