<script setup lang="ts">
const auth = useAuth()
const createTo = computed(() => (auth.loggedIn.value ? '/bots/create' : '/auth/register'))

const tiles = computed(() => [
  {
    icon: 'i-lucide-grid-3x3',
    titleKey: 'home.strategy_grid_futures_title',
    captionKey: 'home.tile_futures',
    badgeKey: 'home.badge_futures',
    to: createTo.value,
    tone: 'a' as const,
  },
  {
    icon: 'i-lucide-arrow-left-right',
    titleKey: 'home.strategy_grid_spot_title',
    captionKey: 'home.tile_spot',
    badgeKey: 'home.badge_spot',
    to: createTo.value,
    tone: 'b' as const,
  },
  {
    icon: 'i-lucide-trending-up',
    titleKey: 'home.strategy_dca_title',
    captionKey: 'home.tile_dca',
    badgeKey: 'home.badge_dca',
    to: createTo.value,
    tone: 'c' as const,
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    titleKey: 'home.strategy_custom_title',
    captionKey: 'home.tile_custom',
    badgeKey: 'home.badge_custom',
    to: createTo.value,
    tone: 'd' as const,
  },
])
</script>

<template>
  <HomeHubTiles
    title-key="home.strategies_title"
    subtitle-key="home.strategies_subtitle"
    :tiles="tiles"
  />
</template>
