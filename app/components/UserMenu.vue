<script setup lang="ts">
const auth = useAuth()
const { t } = useI18n()
const router = useRouter()

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

const menuItems = computed(() => [
  [
    {
      label: displayName.value,
      description: auth.user.value?.email,
      disabled: true,
    },
  ],
  [
    { label: t('settings.title'), to: '/settings' },
    { label: t('nav.bots'), to: '/bots' },
  ],
  [
    {
      label: t('auth.logout'),
      color: 'error' as const,
      onSelect: () => {
        auth.logout()
        router.push('/')
      },
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    v-if="auth.user.value"
    :items="menuItems"
    :content="{ align: 'end' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="gap-2"
      :aria-label="displayName"
    >
      <UAvatar :text="initials" size="sm" />
      <span class="user-menu__name hidden sm:inline max-w-[140px] truncate font-semibold">
        {{ displayName }}
      </span>
      <UIcon name="i-lucide-chevron-down" class="size-4 text-muted hidden sm:inline" />
    </UButton>
  </UDropdownMenu>
</template>
