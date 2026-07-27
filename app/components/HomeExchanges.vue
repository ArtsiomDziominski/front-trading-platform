<script setup lang="ts">
const auth = useAuth()

const settingsLink = computed(() =>
  auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
)

const exchanges = [
  {
    name: 'Binance',
    descKey: 'exchanges.binance_desc',
    exchange: 'BINANCE' as const,
    active: true,
  },
  {
    name: 'Bybit',
    descKey: 'exchanges.bybit_desc',
    exchange: 'BYBIT' as const,
    active: false,
  },
  {
    name: 'OKX',
    descKey: 'exchanges.okx_desc',
    exchange: 'OKX' as const,
    active: true,
  },
]
</script>

<template>
  <section class="exchanges">
    <div class="container">
      <header class="exchanges__header">
        <h2>{{ $t('home.exchanges_title') }}</h2>
        <p>{{ $t('home.exchanges_subtitle') }}</p>
      </header>

      <div class="exchanges__grid">
        <article
          v-for="item in exchanges"
          :key="item.name"
          class="ex-card"
          :class="{ 'ex-card--soon': !item.active }"
        >
          <div class="ex-card__top">
            <ExchangeIcon
              :exchange="item.exchange"
              size="md"
            />
            <span
              class="ex-card__badge"
              :class="{ 'is-soon': !item.active }"
            >
              {{ item.active ? $t('home.badge_live') : $t('home.badge_soon') }}
            </span>
          </div>
          <h3>{{ item.name }}</h3>
          <p>{{ $t(item.descKey) }}</p>
          <NuxtLink
            v-if="item.active"
            :to="settingsLink"
            class="ex-card__link"
          >
            {{ $t('home.exchanges_connect') }}
            <UIcon
              name="i-lucide-arrow-right"
              class="ex-card__arrow"
            />
          </NuxtLink>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.exchanges {
  padding: 72px 0 48px;
  background: #e5ffc3;
  color: #013330;
}

.exchanges__header {
  max-width: 720px;
  margin: 0 auto 36px;
  text-align: center;
}

.exchanges__header h2 {
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  font-weight: 400;
  line-height: 1;
}

.exchanges__header p {
  margin: 14px 0 0;
  color: rgb(1 51 48 / 68%);
  font-size: 1.05rem;
}

.exchanges__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.ex-card {
  display: grid;
  gap: 12px;
  padding: 24px;
  border-radius: 28px;
  background: #013330;
  color: #e5ffc3;
}

.ex-card--soon {
  opacity: 0.78;
}

.ex-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ex-card__badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgb(186 242 74 / 18%);
  color: #baf24a;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ex-card__badge.is-soon {
  background: rgb(229 255 195 / 10%);
  color: rgb(229 255 195 / 70%);
}

.ex-card h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}

.ex-card p {
  margin: 0;
  color: rgb(229 255 195 / 75%);
  font-size: 0.95rem;
  line-height: 1.5;
}

.ex-card__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: #baf24a;
  font-size: 0.9rem;
  font-weight: 750;
  text-decoration: none;
}

.ex-card__arrow {
  width: 16px;
  height: 16px;
}

@media (min-width: 768px) {
  .exchanges__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
