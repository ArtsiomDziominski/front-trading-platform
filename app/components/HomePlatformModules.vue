<script setup lang="ts">
const auth = useAuth()

const modules = computed(() => [
  {
    icon: 'i-lucide-bot',
    titleKey: 'home.module_bots_title',
    descKey: 'home.module_bots_desc',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
  },
  {
    icon: 'i-lucide-building-2',
    titleKey: 'home.module_exchanges_title',
    descKey: 'home.module_exchanges_desc',
    to: '/exchanges',
  },
  {
    icon: 'i-lucide-settings',
    titleKey: 'home.module_settings_title',
    descKey: 'home.module_settings_desc',
    to: auth.loggedIn.value ? '/settings' : '/auth/login',
  },
  {
    icon: 'i-lucide-sparkles',
    titleKey: 'home.module_create_title',
    descKey: 'home.module_create_desc',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/login',
  },
  {
    icon: 'i-lucide-send',
    titleKey: 'home.module_telegram_title',
    descKey: 'home.module_telegram_desc',
    to: auth.loggedIn.value ? '/settings#telegram' : '/auth/login',
  },
  {
    icon: 'i-lucide-shield-check',
    titleKey: 'home.module_auth_title',
    descKey: 'home.module_auth_desc',
    to: '/auth/login',
  },
] as const)
</script>

<template>
  <section class="page-section home-modules">
    <div class="container">
      <div class="section-header">
        <span class="section-label">{{ $t('home.modules_title') }}</span>
        <h2 class="section-title">{{ $t('home.modules_subtitle') }}</h2>
      </div>

      <div class="home-modules__grid">
        <NuxtLink
          v-for="module in modules"
          :key="module.to"
          :to="module.to"
          class="module-card"
        >
          <UCard class="module-card__inner">
            <span class="module-card__icon-wrap">
              <UIcon :name="module.icon" class="module-card__icon" />
            </span>
            <h3 class="module-card__title">{{ $t(module.titleKey) }}</h3>
            <p class="module-card__desc">{{ $t(module.descKey) }}</p>
            <span class="module-card__link">
              <UIcon name="i-lucide-arrow-right" class="module-card__arrow" />
            </span>
          </UCard>
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

.home-modules__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.module-card {
  display: block;
  text-decoration: none;
}

.module-card__inner {
  position: relative;
  height: 100%;
  padding: 28px 24px 24px;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease;
}

.module-card:hover .module-card__inner {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}

.module-card__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  background: var(--color-accent-dim);
  color: var(--color-accent);
  border: 1px solid rgb(52 211 153 / 14%);
}

.module-card__icon {
  width: 24px;
  height: 24px;
}

.module-card__title {
  margin: 0 0 10px;
  font-size: 1.08rem;
  font-weight: 700;
}

.module-card__desc {
  margin: 0;
  padding-right: 28px;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.6;
}

.module-card__link {
  position: absolute;
  right: 20px;
  bottom: 20px;
  color: var(--color-accent);
}

.module-card__arrow {
  width: 18px;
  height: 18px;
}
</style>
