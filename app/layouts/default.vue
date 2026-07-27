<script setup lang="ts">
const auth = useAuth()

const botsNavTo = computed(() => (auth.loggedIn.value ? '/bots' : '/bots/overview'))

onMounted(() => {
  if (auth.user.value === null) {
    auth.fetchUser()
  }
})
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container site-header__inner">
        <NuxtLink
          class="brand"
          to="/"
        >
          Bot Platform
        </NuxtLink>

        <div class="site-header__menu">
          <nav
            class="nav"
            aria-label="Основная навигация"
          >
            <NuxtLink to="/">
              {{ $t('nav.home') }}
            </NuxtLink>
            <NuxtLink :to="botsNavTo">
              {{ $t('nav.bots') }}
            </NuxtLink>
            <NuxtLink to="/exchanges">
              {{ $t('nav.exchanges') }}
            </NuxtLink>
          </nav>
        </div>

        <div class="site-header__actions">
          <UserMenu v-if="auth.loggedIn.value" />
          <template v-else>
            <LangSwitcher />
            <NuxtLink
              class="header-cta"
              to="/auth/register"
            >
              {{ $t('home.hero_cta') }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding-top: env(safe-area-inset-top);
  border-bottom: 1px solid var(--color-border);
  background: rgb(229 255 195 / 82%);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}

.site-header__inner {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand {
  flex-shrink: 0;
  color: var(--color-text);
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.site-header__menu {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 0.92rem;
  font-weight: 600;
}

.nav a {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  text-decoration: none;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--color-text);
  background: rgb(1 51 48 / 8%);
}

.site-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.header-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
}

@media (max-width: 768px) {
  .site-header__inner {
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 0;
  }

  .site-header__menu {
    order: 3;
    width: 100%;
  }

  .nav {
    width: 100%;
    justify-content: stretch;
    gap: 6px;
    padding: 4px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: rgb(1 51 48 / 5%);
    font-size: 0.85rem;
  }

  .nav a {
    flex: 1 1 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    white-space: nowrap;
  }

  .site-header__actions {
    margin-left: auto;
  }
}
</style>
