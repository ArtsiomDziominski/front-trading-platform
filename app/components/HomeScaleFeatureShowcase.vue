<script setup lang="ts">
const auth = useAuth()

type VisualType = 'bots' | 'strategies' | 'exchanges' | 'security' | 'telegram' | 'market'
type GlowTone = 'violet' | 'blue' | 'cyan' | 'magenta' | 'indigo' | 'sky'

const features = computed(() => [
  {
    icon: 'i-lucide-bot',
    titleKey: 'home.scale_feature_bots_title',
    descKey: 'home.scale_feature_bots_desc',
    linkKey: 'home.scale_learn_more',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
    visual: 'bots' as VisualType,
    tone: 'violet' as GlowTone,
    reverse: false,
  },
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.scale_feature_strategies_title',
    descKey: 'home.scale_feature_strategies_desc',
    linkKey: 'home.scale_learn_more',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    visual: 'strategies' as VisualType,
    tone: 'blue' as GlowTone,
    reverse: true,
  },
  {
    icon: 'i-lucide-building-2',
    titleKey: 'home.scale_feature_exchanges_title',
    descKey: 'home.scale_feature_exchanges_desc',
    linkKey: 'home.scale_learn_more',
    to: '/exchanges',
    visual: 'exchanges' as VisualType,
    tone: 'cyan' as GlowTone,
    reverse: false,
  },
  {
    icon: 'i-lucide-shield-check',
    titleKey: 'home.scale_feature_security_title',
    descKey: 'home.scale_feature_security_desc',
    linkKey: 'home.scale_learn_more',
    to: auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
    visual: 'security' as VisualType,
    tone: 'magenta' as GlowTone,
    reverse: true,
  },
  {
    icon: 'i-lucide-send',
    titleKey: 'home.scale_feature_telegram_title',
    descKey: 'home.scale_feature_telegram_desc',
    linkKey: 'home.scale_learn_more',
    to: auth.loggedIn.value ? '/settings#telegram' : '/auth/login',
    visual: 'telegram' as VisualType,
    tone: 'indigo' as GlowTone,
    reverse: false,
  },
  {
    icon: 'i-lucide-line-chart',
    titleKey: 'home.scale_feature_market_title',
    descKey: 'home.scale_feature_market_desc',
    linkKey: 'home.scale_learn_more',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
    visual: 'market' as VisualType,
    tone: 'sky' as GlowTone,
    reverse: true,
  },
])

const botRows = [
  { pair: 'ETHUSDT', type: 'Grid Futures', pnl: '+12.4%', side: 'Long' },
  { pair: 'BTCUSDT', type: 'Grid Spot', pnl: '+4.8%', side: 'Spot' },
  { pair: 'SOLUSDT', type: 'DCA Futures', pnl: '+9.1%', side: 'Long' },
  { pair: 'BNBUSDT', type: 'Grid Futures', pnl: '-1.2%', side: 'Short' },
] as const
</script>

<template>
  <section class="scale-features">
    <ScrollReveal
      v-for="feature in features"
      :key="feature.titleKey"
      :distance="36"
    >
      <article
        class="scale-feature"
        :class="[
          `scale-feature--${feature.tone}`,
          { 'scale-feature--reverse': feature.reverse },
        ]"
      >
        <div class="scale-feature__shell">
          <div class="scale-feature__copy">
            <div class="scale-feature__icon">
              <UIcon :name="feature.icon" />
            </div>
            <h2>{{ $t(feature.titleKey) }}</h2>
            <p>{{ $t(feature.descKey) }}</p>
            <NuxtLink
              :to="feature.to"
              class="scale-feature__link"
            >
              {{ $t(feature.linkKey) }}
              <UIcon name="i-lucide-arrow-right" />
            </NuxtLink>
          </div>

          <div class="scale-feature__visual">
            <div class="scale-glow">
              <div class="scale-glow__bloom" />
              <div class="scale-glow__frame">
                <div
                  class="scale-mock"
                  :class="`scale-mock--${feature.visual}`"
                >
                  <template v-if="feature.visual === 'bots'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>Live bots</span>
                      <span class="scale-mock__pill">WebSocket</span>
                    </div>
                    <div class="scale-mock__bots">
                      <div
                        v-for="row in botRows"
                        :key="row.pair"
                        class="scale-mock__bot"
                      >
                        <div>
                          <strong>{{ row.pair }}</strong>
                          <small>{{ row.type }} · {{ row.side }}</small>
                        </div>
                        <span
                          class="scale-mock__pnl"
                          :class="{ 'is-neg': row.pnl.startsWith('-') }"
                        >{{ row.pnl }}</span>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="feature.visual === 'strategies'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>Grid levels</span>
                    </div>
                    <div class="scale-mock__grid-board">
                      <div class="scale-mock__price-axis">
                        <span>2480</span>
                        <span>2420</span>
                        <span>2360</span>
                        <span>2300</span>
                      </div>
                      <div class="scale-mock__levels">
                        <div
                          v-for="n in 8"
                          :key="n"
                          class="scale-mock__level"
                          :class="n <= 4 ? 'is-sell' : 'is-buy'"
                        >
                          <span>{{ n <= 4 ? 'SELL' : 'BUY' }}</span>
                          <b>{{ (2480 - (n - 1) * 20).toFixed(0) }}</b>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="feature.visual === 'exchanges'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>Connected venues</span>
                    </div>
                    <div class="scale-mock__venues">
                      <div class="scale-mock__venue is-live">
                        <ExchangeIcon
                          exchange="BINANCE"
                          size="compact"
                        />
                        <div>
                          <strong>Binance</strong>
                          <small>2 keys · Futures</small>
                        </div>
                        <em>Live</em>
                      </div>
                      <div class="scale-mock__venue is-live">
                        <ExchangeIcon
                          exchange="OKX"
                          size="compact"
                        />
                        <div>
                          <strong>OKX</strong>
                          <small>1 key · Spot + Futures</small>
                        </div>
                        <em>Live</em>
                      </div>
                      <div class="scale-mock__venue">
                        <ExchangeIcon
                          exchange="BYBIT"
                          size="compact"
                        />
                        <div>
                          <strong>Bybit</strong>
                          <small>Integration ready</small>
                        </div>
                        <em>Soon</em>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="feature.visual === 'security'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>Key vault</span>
                    </div>
                    <div class="scale-mock__vault">
                      <div class="scale-mock__shield">
                        <UIcon name="i-lucide-shield-check" />
                      </div>
                      <div class="scale-mock__vault-rows">
                        <div><span>Encryption</span><b>AES-256</b></div>
                        <div><span>Token TTL</span><b>Short-lived</b></div>
                        <div><span>Storage</span><b>Server-side</b></div>
                        <div><span>Audit</span><b>Full trail</b></div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="feature.visual === 'telegram'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>Alerts</span>
                    </div>
                    <div class="scale-mock__feed">
                      <div class="scale-mock__msg">
                        <span class="scale-mock__avatar" />
                        <div>
                          <strong>Bot started</strong>
                          <p>ETHUSDT Grid Futures is live on Binance.</p>
                          <small>12:41</small>
                        </div>
                      </div>
                      <div class="scale-mock__msg">
                        <span class="scale-mock__avatar" />
                        <div>
                          <strong>Order filled</strong>
                          <p>BUY 0.42 ETH @ 2364.80</p>
                          <small>12:47</small>
                        </div>
                      </div>
                      <div class="scale-mock__msg is-ok">
                        <span class="scale-mock__avatar" />
                        <div>
                          <strong>Take profit hit</strong>
                          <p>+$128.40 realized · cycle restarted</p>
                          <small>13:02</small>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="feature.visual === 'market'">
                    <div class="scale-mock__chrome">
                      <div class="scale-mock__dots"><i /><i /><i /></div>
                      <span>PnL overview</span>
                      <span class="scale-mock__pill is-green">+18.6%</span>
                    </div>
                    <div class="scale-mock__chart-wrap">
                      <svg
                        viewBox="0 0 360 140"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient
                            id="areaFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stop-color="#8b5cf6"
                              stop-opacity="0.45"
                            />
                            <stop
                              offset="100%"
                              stop-color="#8b5cf6"
                              stop-opacity="0"
                            />
                          </linearGradient>
                          <linearGradient
                            id="lineStroke"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stop-color="#60a5fa"
                            />
                            <stop
                              offset="100%"
                              stop-color="#c084fc"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,110 C40,100 60,90 90,78 C120,66 140,88 170,70 C200,52 220,40 250,34 C280,28 310,48 360,18 L360,140 L0,140 Z"
                          fill="url(#areaFill)"
                        />
                        <path
                          d="M0,110 C40,100 60,90 90,78 C120,66 140,88 170,70 C200,52 220,40 250,34 C280,28 310,48 360,18"
                          fill="none"
                          stroke="url(#lineStroke)"
                          stroke-width="2.5"
                        />
                      </svg>
                      <div class="scale-mock__stats">
                        <div><small>Today</small><b>+2.4%</b></div>
                        <div><small>7d</small><b>+9.8%</b></div>
                        <div><small>Active</small><b>12 bots</b></div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </ScrollReveal>
  </section>
</template>

<style scoped>
.scale-features {
  background: #000;
  color: #fff;
}

.scale-feature {
  padding: clamp(72px, 10vw, 120px) 0;
}

.scale-feature__shell {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  align-items: center;
  gap: clamp(40px, 6vw, 80px);
}

.scale-feature__copy {
  display: grid;
  gap: 18px;
  max-width: 460px;
}

.scale-feature__icon {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(129 140 248 / 35%), rgb(168 85 247 / 20%));
  border: 1px solid rgb(255 255 255 / 10%);
  color: #c4b5fd;
  box-shadow: 0 0 24px rgb(129 140 248 / 18%);
}

.scale-feature__icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.scale-feature__copy h2 {
  margin: 0;
  font-size: clamp(1.75rem, 3.4vw, 2.45rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
}

.scale-feature__copy p {
  margin: 0;
  color: rgb(255 255 255 / 55%);
  font-size: 1.05rem;
  line-height: 1.65;
}

.scale-feature__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin-top: 4px;
  color: #c4b5fd;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: gap 0.2s ease, color 0.2s ease;
}

.scale-feature__link:hover {
  gap: 12px;
  color: #ddd6fe;
}

.scale-feature__link :deep(svg) {
  width: 16px;
  height: 16px;
}

.scale-glow {
  position: relative;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.scale-glow:hover {
  transform: translateY(-4px);
}

.scale-glow__bloom {
  position: absolute;
  inset: -18% -8%;
  border-radius: 40%;
  background: radial-gradient(circle, var(--glow) 0%, transparent 68%);
  opacity: 0.55;
  filter: blur(28px);
  pointer-events: none;
}

.scale-feature--violet { --glow: rgb(139 92 246 / 45%); }
.scale-feature--blue { --glow: rgb(59 130 246 / 45%); }
.scale-feature--cyan { --glow: rgb(34 211 238 / 40%); }
.scale-feature--magenta { --glow: rgb(232 121 249 / 40%); }
.scale-feature--indigo { --glow: rgb(99 102 241 / 45%); }
.scale-feature--sky { --glow: rgb(56 189 248 / 40%); }

.scale-glow__frame {
  position: relative;
  padding: 1px;
  border-radius: 22px;
  background: linear-gradient(145deg, rgb(255 255 255 / 22%), rgb(255 255 255 / 4%) 40%, rgb(255 255 255 / 14%));
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 4%),
    0 30px 80px rgb(0 0 0 / 55%);
}

.scale-mock {
  min-height: 340px;
  padding: 18px;
  border-radius: 21px;
  background:
    linear-gradient(165deg, rgb(18 18 28 / 96%) 0%, rgb(8 8 14 / 98%) 100%);
  overflow: hidden;
}

.scale-mock__chrome {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  color: rgb(255 255 255 / 55%);
  font-size: 0.78rem;
  font-weight: 600;
}

.scale-mock__dots {
  display: flex;
  gap: 5px;
}

.scale-mock__dots i {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(255 255 255 / 16%);
}

.scale-mock__pill {
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(129 140 248 / 18%);
  color: #c4b5fd;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scale-mock__pill.is-green {
  background: rgb(74 222 128 / 14%);
  color: #4ade80;
}

.scale-mock__bots,
.scale-mock__venues,
.scale-mock__feed {
  display: grid;
  gap: 10px;
}

.scale-mock__bot,
.scale-mock__venue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 6%);
}

.scale-mock__bot strong,
.scale-mock__venue strong,
.scale-mock__msg strong {
  display: block;
  font-size: 0.92rem;
}

.scale-mock__bot small,
.scale-mock__venue small {
  color: rgb(255 255 255 / 42%);
  font-size: 0.72rem;
}

.scale-mock__pnl {
  color: #4ade80;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.scale-mock__pnl.is-neg {
  color: #fb7185;
}

.scale-mock__grid-board {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  min-height: 260px;
}

.scale-mock__price-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: rgb(255 255 255 / 35%);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  padding: 6px 0;
}

.scale-mock__levels {
  display: grid;
  gap: 8px;
}

.scale-mock__level {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
}

.scale-mock__level.is-sell {
  background: linear-gradient(90deg, rgb(251 113 133 / 18%), rgb(251 113 133 / 4%));
  border: 1px solid rgb(251 113 133 / 22%);
  color: #fda4af;
}

.scale-mock__level.is-buy {
  background: linear-gradient(90deg, rgb(74 222 128 / 16%), rgb(74 222 128 / 4%));
  border: 1px solid rgb(74 222 128 / 20%);
  color: #86efac;
}

.scale-mock__venue {
  justify-content: flex-start;
}

.scale-mock__venue > div {
  flex: 1;
}

.scale-mock__venue em {
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 40%);
}

.scale-mock__venue.is-live em {
  color: #4ade80;
}

.scale-mock__vault {
  display: grid;
  gap: 18px;
  justify-items: center;
  padding: 12px 8px 8px;
}

.scale-mock__shield {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: linear-gradient(145deg, rgb(168 85 247 / 35%), rgb(59 130 246 / 25%));
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 0 40px rgb(168 85 247 / 25%);
  color: #e9d5ff;
}

.scale-mock__shield :deep(svg) {
  width: 32px;
  height: 32px;
}

.scale-mock__vault-rows {
  width: 100%;
  display: grid;
  gap: 8px;
}

.scale-mock__vault-rows div {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 6%);
  font-size: 0.85rem;
}

.scale-mock__vault-rows span {
  color: rgb(255 255 255 / 45%);
}

.scale-mock__msg {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 6%);
}

.scale-mock__msg.is-ok {
  border-color: rgb(74 222 128 / 18%);
  background: rgb(74 222 128 / 6%);
}

.scale-mock__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(145deg, #818cf8, #c084fc);
}

.scale-mock__msg p {
  margin: 4px 0;
  color: rgb(255 255 255 / 62%);
  font-size: 0.82rem;
  line-height: 1.4;
}

.scale-mock__msg small {
  color: rgb(255 255 255 / 35%);
  font-size: 0.7rem;
}

.scale-mock__chart-wrap {
  display: grid;
  gap: 14px;
}

.scale-mock__chart-wrap svg {
  width: 100%;
  height: 160px;
}

.scale-mock__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.scale-mock__stats div {
  padding: 12px;
  border-radius: 12px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 6%);
}

.scale-mock__stats small {
  display: block;
  color: rgb(255 255 255 / 40%);
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.scale-mock__stats b {
  font-size: 0.95rem;
}

@media (min-width: 960px) {
  .scale-feature__shell {
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  }

  .scale-feature--reverse .scale-feature__shell {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  }

  .scale-feature--reverse .scale-feature__copy {
    order: 2;
  }

  .scale-feature--reverse .scale-feature__visual {
    order: 1;
  }
}
</style>
