<script setup lang="ts">
const auth = useAuth()

const settingsLink = computed(() =>
  auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
)

const steps = computed(() => [
  {
    number: '01',
    icon: 'i-lucide-user-plus',
    titleKey: 'home.step_1_title',
    descKey: 'home.step_1_desc',
    to: '/auth/register',
  },
  {
    number: '02',
    icon: 'i-lucide-key-round',
    titleKey: 'home.step_2_title',
    descKey: 'home.step_2_desc',
    to: settingsLink.value,
  },
  {
    number: '03',
    icon: 'i-lucide-bot',
    titleKey: 'home.step_3_title',
    descKey: 'home.step_3_desc',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/login',
  },
  {
    number: '04',
    icon: 'i-lucide-activity',
    titleKey: 'home.step_4_title',
    descKey: 'home.step_4_desc',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
  },
])
</script>

<template>
  <section class="page-section home-steps">
    <div class="container">
      <div class="section-header">
        <span class="section-label">{{ $t('home.steps_title') }}</span>
        <h2 class="section-title">{{ $t('home.steps_subtitle') }}</h2>
      </div>

      <div class="home-steps__grid">
        <NuxtLink
          v-for="step in steps"
          :key="step.number"
          :to="step.to"
          class="step-card neumo"
        >
          <div class="step-card__head">
            <span class="step-card__number">{{ step.number }}</span>
            <span class="step-card__icon-wrap">
              <UIcon :name="step.icon" class="step-card__icon" />
            </span>
          </div>
          <h3 class="step-card__title">{{ $t(step.titleKey) }}</h3>
          <p class="step-card__desc">{{ $t(step.descKey) }}</p>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: 36px;
}

.home-steps__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.step-card {
  display: block;
  padding: 28px 24px;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.step-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.step-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.step-card__number {
  color: var(--color-accent);
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.step-card__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-dim);
  color: var(--color-accent);
}

.step-card__icon {
  width: 22px;
  height: 22px;
}

.step-card__title {
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 700;
}

.step-card__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}
</style>
