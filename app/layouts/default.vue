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
        <NuxtLink class="brand" to="/">
          Bot Platform
        </NuxtLink>
        <div class="site-header__menu">
          <nav class="nav" aria-label="Основная навигация">
            <NuxtLink to="/">
              {{ $t('nav.home') }}
            </NuxtLink>
            <NuxtLink :to="botsNavTo">
              {{ $t('nav.bots') }}
            </NuxtLink>
            <NuxtLink to="/exchanges">
              {{ $t('nav.exchanges') }}
            </NuxtLink>
            <NuxtLink to="/swagger">
              {{ $t('nav.api') }}
            </NuxtLink>
          </nav>

          <div v-if="!auth.loggedIn.value" class="site-header__auth">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              to="/auth/login"
            >
              {{ $t('auth.login') }}
            </UButton>
            <UButton size="sm" to="/auth/register">
              {{ $t('auth.register') }}
            </UButton>
          </div>
        </div>

        <div class="site-header__actions">
          <UserMenu v-if="auth.loggedIn.value" />
          <LangSwitcher />
        </div>
      </div>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.site-header {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 100;
}

.site-header__inner {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  color: var(--color-accent);
  font-weight: 800;
  font-size: 1.1rem;
  text-decoration: none;
  flex-shrink: 0;
}

.site-header__menu {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-width: 0;
}

.site-header__auth {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav {
  display: flex;
  align-items: center;
  gap: 20px;
  color: var(--color-text-muted);
  font-size: 0.92rem;
  font-weight: 500;
}

.nav a {
  text-decoration: none;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav a:hover {
  color: var(--color-text);
}

.nav a.router-link-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .site-header__inner {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 0;
  }

  .site-header__menu {
    order: 3;
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }

  .nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    font-size: 0.85rem;
  }

  .site-header__auth {
    justify-content: center;
    width: 100%;
  }

  .brand {
    font-size: 1rem;
  }

  .site-header__actions {
    margin-left: auto;
  }
}
</style>
