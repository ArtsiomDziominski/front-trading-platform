<script setup lang="ts">
const auth = useAuth()

const metrics = computed(() => [
  {
    icon: 'i-lucide-building-2',
    valueKey: 'home.trust_1_value',
    labelKey: 'home.trust_1_label',
    to: '/exchanges',
  },
  {
    icon: 'i-lucide-layers',
    valueKey: 'home.trust_2_value',
    labelKey: 'home.trust_2_label',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
  },
  {
    icon: 'i-lucide-shield',
    valueKey: 'home.trust_3_value',
    labelKey: 'home.trust_3_label',
    to: auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
  },
  {
    icon: 'i-lucide-activity',
    valueKey: 'home.trust_4_value',
    labelKey: 'home.trust_4_label',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
  },
] as const)
</script>

<template>
  <section class="trust">
    <div class="container">
      <ul class="trust__grid">
        <li
          v-for="metric in metrics"
          :key="metric.valueKey"
        >
          <NuxtLink
            :to="metric.to"
            class="trust-card"
          >
            <div class="trust-card__copy">
              <span class="trust-card__value">{{ $t(metric.valueKey) }}</span>
              <span class="trust-card__label">{{ $t(metric.labelKey) }}</span>
            </div>
            <div
              class="trust-card__art"
              aria-hidden="true"
            >
              <UIcon
                :name="metric.icon"
                class="trust-card__glyph"
              />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.trust {
  padding: 48px 0 32px;
  background: #e5ffc3;
  color: #013330;
}

.trust__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trust-card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  min-height: 280px;
  border-radius: 28px;
  background: #013330;
  color: #e5ffc3;
  text-decoration: none;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.trust-card:hover {
  transform: scale(0.98);
}

.trust-card__copy {
  display: grid;
  gap: 10px;
  padding: 28px 24px 10px;
}

.trust-card__value {
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  white-space: pre-line;
}

.trust-card__label {
  color: rgb(229 255 195 / 72%);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  white-space: pre-line;
}

.trust-card__art {
  display: grid;
  place-items: end center;
  padding-bottom: 28px;
  background:
    radial-gradient(circle at 50% 80%, rgb(186 242 74 / 35%), transparent 50%),
    linear-gradient(180deg, transparent, #012421);
}

.trust-card__glyph {
  width: 52px;
  height: 52px;
  color: #baf24a;
}

@media (min-width: 768px) {
  .trust__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .trust__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
