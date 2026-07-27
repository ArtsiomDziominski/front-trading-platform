<script setup lang="ts">
const auth = useAuth()

const tiles = computed(() => [
  {
    icon: 'i-lucide-bot',
    titleKey: 'home.module_bots_title',
    captionKey: 'home.tile_bots',
    badgeKey: 'home.badge_live',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
    tone: 'b' as const,
  },
  {
    icon: 'i-lucide-send',
    titleKey: 'home.module_telegram_title',
    captionKey: 'home.tile_telegram',
    badgeKey: 'home.badge_alerts',
    to: auth.loggedIn.value ? '/settings#telegram' : '/auth/login',
    tone: 'a' as const,
  },
  {
    icon: 'i-lucide-building-2',
    titleKey: 'home.module_exchanges_title',
    captionKey: 'home.tile_exchanges',
    badgeKey: 'home.badge_multi',
    to: '/exchanges',
    tone: 'd' as const,
  },
  {
    icon: 'i-lucide-sparkles',
    titleKey: 'home.module_create_title',
    captionKey: 'home.tile_create',
    badgeKey: 'home.badge_wizard',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/register',
    tone: 'c' as const,
  },
])
</script>

<template>
  <HomeHubTiles
    title-key="home.modules_title"
    subtitle-key="home.modules_subtitle"
    :tiles="tiles"
  />
</template>
