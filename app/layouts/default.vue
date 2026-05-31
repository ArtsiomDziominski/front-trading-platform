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
          </nav>
        </div>

        <div class="site-header__actions">
          <UserMenu v-if="auth.loggedIn.value" />
          <LangSwitcher v-if="!auth.loggedIn.value" />
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
  border-bottom: 1px solid var(--color-border);
  background: rgb(6 6 8 / 72%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.site-header__inner {
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  color: var(--color-text);
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.03em;
  text-decoration: none;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-accent) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.site-header__menu {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-width: 0;
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.nav a {
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.nav a:hover {
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.nav a.router-link-active {
  color: var(--color-accent);
  background: var(--color-accent-dim);
  border-color: rgb(52 211 153 / 18%);
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
    gap: 8px;
    font-size: 0.85rem;
  }

  .brand {
    font-size: 1rem;
  }

  .site-header__actions {
    margin-left: auto;
  }
}
</style>
