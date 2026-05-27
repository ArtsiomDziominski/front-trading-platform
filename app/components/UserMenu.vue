<script setup lang="ts">
const auth = useAuth()
const { t } = useI18n()
const router = useRouter()

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const displayName = computed(() => {
  const u = auth.user.value
  if (!u) return ''
  return u.name?.trim() || u.email
})

const initials = computed(() => {
  const u = auth.user.value
  if (!u) return '?'
  const source = u.name?.trim() || u.email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
})

function toggleMenu() {
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

function handleLogout() {
  closeMenu()
  auth.logout()
  router.push('/')
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return
  if (!menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onEscape)
})
</script>

<template>
  <div v-if="auth.user.value" ref="menuRef" class="user-menu">
    <button
      type="button"
      class="user-menu__trigger"
      :aria-expanded="open"
      aria-haspopup="true"
      @click.stop="toggleMenu"
    >
      <span class="user-menu__avatar" aria-hidden="true">{{ initials }}</span>
      <span class="user-menu__name">{{ displayName }}</span>
      <span class="user-menu__chevron" :class="{ 'user-menu__chevron--open': open }" aria-hidden="true">▾</span>
    </button>

    <div v-show="open" class="user-menu__dropdown" role="menu">
      <div class="user-menu__header">
        <p class="user-menu__header-name">{{ displayName }}</p>
        <p class="user-menu__header-email">{{ auth.user.value.email }}</p>
      </div>

      <NuxtLink to="/settings" class="user-menu__item" role="menuitem" @click="closeMenu">
        {{ $t('settings.title') }}
      </NuxtLink>
      <NuxtLink to="/bots" class="user-menu__item" role="menuitem" @click="closeMenu">
        {{ $t('nav.bots') }}
      </NuxtLink>

      <hr class="user-menu__divider">

      <button type="button" class="user-menu__item user-menu__item--danger" role="menuitem" @click="handleLogout">
        {{ $t('auth.logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu__trigger:hover,
.user-menu__trigger[aria-expanded='true'] {
  background: var(--color-surface-alt);
}

.user-menu__avatar {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-menu__name {
  max-width: 140px;
  overflow: hidden;
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__chevron {
  color: var(--color-text-muted);
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.user-menu__chevron--open {
  transform: rotate(180deg);
}

.user-menu__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 200;
  min-width: 220px;
  padding: 8px 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.user-menu__header {
  padding: 8px 16px 12px;
}

.user-menu__header-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.user-menu__header-email {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  word-break: break-all;
}

.user-menu__item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 0.88rem;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.user-menu__item:hover {
  background: var(--color-surface-alt);
  color: var(--color-accent);
}

.user-menu__item--danger:hover {
  color: var(--color-danger);
}

.user-menu__divider {
  margin: 6px 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .user-menu__name {
    display: none;
  }

  .user-menu__chevron {
    display: none;
  }
}
</style>
