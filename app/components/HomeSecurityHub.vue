<script setup lang="ts">
const auth = useAuth()
const appPath = useAppPath()

const tiles = computed(() => [
  {
    icon: 'i-lucide-shield-check',
    titleKey: 'home.security_keys_title',
    captionKey: 'home.tile_secure_keys',
    badgeKey: 'home.badge_aes',
    to: appPath(auth.loggedIn.value ? '/settings#api-keys' : '/auth/login'),
    tone: 'a' as const,
  },
  {
    icon: 'i-lucide-key-round',
    titleKey: 'home.security_setup_title',
    captionKey: 'home.tile_setup',
    badgeKey: 'home.badge_fast',
    to: appPath(auth.loggedIn.value ? '/settings#api-keys' : '/auth/register'),
    tone: 'b' as const,
  },
  {
    icon: 'i-lucide-bell',
    titleKey: 'home.security_alerts_title',
    captionKey: 'home.tile_alerts',
    badgeKey: 'home.badge_24_7',
    to: appPath(auth.loggedIn.value ? '/settings#telegram' : '/auth/login'),
    tone: 'c' as const,
  },
  {
    icon: 'i-lucide-lock',
    titleKey: 'home.security_audit_title',
    captionKey: 'home.tile_audit',
    badgeKey: 'home.badge_audit',
    to: appPath(auth.loggedIn.value ? '/settings' : '/auth/login'),
    tone: 'd' as const,
  },
])
</script>

<template>
  <HomeHubTiles
    title-key="home.security_title"
    subtitle-key="home.security_subtitle"
    :tiles="tiles"
  />
</template>
