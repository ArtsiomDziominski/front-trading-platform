<script setup lang="ts">
const auth = useAuth()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const botsNavTo = computed(() => (auth.loggedIn.value ? '/bots' : '/bots/overview'))

const bottomNavItems = computed(() => [
  {
    to: '/',
    label: t('nav.home'),
    icon: 'i-lucide-house',
    isActive: route.path === '/',
  },
  {
    to: botsNavTo.value,
    label: t('nav.bots'),
    icon: 'i-lucide-bot',
    isActive: route.path.startsWith('/bots'),
  },
  {
    to: '/exchanges',
    label: t('nav.exchanges'),
    icon: 'i-lucide-landmark',
    isActive: route.path.startsWith('/exchanges'),
  },
])

const isMoreActive = computed(() => route.path.startsWith('/settings'))

const moreMenuItems = computed(() => {
  if (auth.loggedIn.value) {
    return [
      [
        {
          label: t('settings.title'),
          icon: 'i-lucide-settings',
          to: '/settings',
        },
      ],
      [
        {
          label: t('auth.logout'),
          icon: 'i-lucide-log-out',
          color: 'error' as const,
          onSelect: () => {
            auth.logout()
            router.push('/')
          },
        },
      ],
    ]
  }

  return [
    [
      {
        label: t('auth.login'),
        icon: 'i-lucide-log-in',
        to: '/auth/login',
      },
      {
        label: t('auth.register'),
        icon: 'i-lucide-user-plus',
        to: '/auth/register',
      },
    ],
  ]
})

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
            <AppButton
              size="sm"
              to="/auth/register"
            >
              {{ $t('home.hero_cta') }}
            </AppButton>
          </template>
        </div>
      </div>
    </header>

    <div class="app-shell__content">
      <slot />
    </div>

    <nav
      class="bottom-nav"
      aria-label="Мобильная навигация"
    >
      <NuxtLink
        v-for="item in bottomNavItems"
        :key="item.to"
        :to="item.to"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': item.isActive }"
      >
        <UIcon
          :name="item.icon"
          class="bottom-nav__icon"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>

      <UDropdownMenu
        :items="moreMenuItems"
        :content="{ align: 'end', side: 'top', sideOffset: 10 }"
      >
        <button
          type="button"
          class="bottom-nav__item bottom-nav__more"
          :class="{ 'bottom-nav__item--active': isMoreActive }"
          :aria-label="$t('nav.more')"
        >
          <UIcon
            name="i-lucide-ellipsis"
            class="bottom-nav__icon"
          />
          <span>{{ $t('nav.more') }}</span>
        </button>
      </UDropdownMenu>
    </nav>
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

.app-shell__content {
  min-width: 0;
}

.bottom-nav {
  display: none;
}

@media (max-width: 1024px) {
  .site-header {
    display: none;
  }

  .bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-border);
    background: rgb(229 255 195 / 92%);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
  }

  .bottom-nav__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    min-height: 52px;
    padding: 8px 6px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition:
      color 0.2s ease,
      background 0.2s ease;
  }

  .bottom-nav__more {
    appearance: none;
  }

  .bottom-nav__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .bottom-nav__item--active {
    color: var(--color-text);
    background: rgb(1 51 48 / 10%);
  }

  .app-shell__content {
    padding-bottom: calc(76px + env(safe-area-inset-bottom));
  }
}
</style>
