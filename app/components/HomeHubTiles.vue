<script setup lang="ts">
defineProps<{
  titleKey: string
  subtitleKey?: string
  tiles: ReadonlyArray<{
    icon: string
    captionKey: string
    titleKey?: string
    badgeKey?: string
    to: string
    tone?: 'a' | 'b' | 'c' | 'd'
  }>
}>()
</script>

<template>
  <section class="hub">
    <div class="container">
      <header class="hub__header">
        <h2 class="hub__title">
          {{ $t(titleKey) }}
        </h2>
        <p
          v-if="subtitleKey"
          class="hub__subtitle"
        >
          {{ $t(subtitleKey) }}
        </p>
      </header>

      <div class="hub__grid">
        <NuxtLink
          v-for="tile in tiles"
          :key="tile.captionKey"
          :to="tile.to"
          class="hub-tile"
          :class="`hub-tile--${tile.tone || 'a'}`"
        >
          <div
            class="hub-tile__art"
            aria-hidden="true"
          >
            <div class="hub-tile__orb hub-tile__orb--1" />
            <div class="hub-tile__orb hub-tile__orb--2" />
            <div class="hub-tile__panel" />
            <UIcon
              :name="tile.icon"
              class="hub-tile__icon"
            />
            <span
              v-if="tile.badgeKey"
              class="hub-tile__badge"
            >
              {{ $t(tile.badgeKey) }}
            </span>
          </div>
          <div class="hub-tile__body">
            <h3
              v-if="tile.titleKey"
              class="hub-tile__name"
            >
              {{ $t(tile.titleKey) }}
            </h3>
            <p class="hub-tile__caption">
              {{ $t(tile.captionKey) }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hub {
  padding: 96px 0 48px;
  background: #e5ffc3;
  color: #013330;
}

.hub__header {
  max-width: 720px;
  margin: 0 auto 44px;
  text-align: center;
}

.hub__title {
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(2.6rem, 7vw, 4.6rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
  white-space: pre-line;
}

.hub__subtitle {
  max-width: 48ch;
  margin: 16px auto 0;
  color: rgb(1 51 48 / 68%);
  font-size: 1.08rem;
  line-height: 1.55;
}

.hub__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.hub-tile {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 440px;
  border-radius: 28px;
  background: #013330;
  color: #e5ffc3;
  text-decoration: none;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.hub-tile:hover {
  transform: translateY(-5px) scale(0.995);
}

.hub-tile__art {
  position: relative;
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 280px;
  overflow: hidden;
}

.hub-tile__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
}

.hub-tile__orb--1 {
  width: 55%;
  height: 55%;
  top: 8%;
  left: 8%;
  background: rgb(255 255 255 / 14%);
}

.hub-tile__orb--2 {
  width: 40%;
  height: 40%;
  right: 6%;
  bottom: 10%;
  background: rgb(255 255 255 / 10%);
}

.hub-tile__panel {
  position: absolute;
  width: 42%;
  height: 48%;
  border-radius: 22px;
  rotate: -14deg;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 12%);
}

.hub-tile--a .hub-tile__art {
  background:
    radial-gradient(circle at 35% 35%, rgb(186 242 74 / 55%), transparent 42%),
    linear-gradient(160deg, #02635c, #013330);
}

.hub-tile--b .hub-tile__art {
  background:
    radial-gradient(circle at 65% 30%, rgb(206 233 253 / 70%), transparent 42%),
    linear-gradient(160deg, #0a4a6e, #013330);
}

.hub-tile--c .hub-tile__art {
  background:
    radial-gradient(circle at 45% 50%, rgb(229 255 195 / 50%), transparent 42%),
    linear-gradient(160deg, #2a5a20, #013330);
}

.hub-tile--d .hub-tile__art {
  background:
    radial-gradient(circle at 55% 40%, rgb(255 200 120 / 45%), transparent 42%),
    linear-gradient(160deg, #5a3a12, #013330);
}

.hub-tile__icon {
  position: relative;
  z-index: 1;
  width: clamp(56px, 9vw, 88px);
  height: clamp(56px, 9vw, 88px);
  color: #e5ffc3;
  filter: drop-shadow(0 14px 28px rgb(0 0 0 / 35%));
}

.hub-tile__badge {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgb(229 255 195 / 16%);
  color: #e5ffc3;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hub-tile__body {
  display: grid;
  gap: 8px;
  padding: 22px 24px 26px;
}

.hub-tile__name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hub-tile__caption {
  margin: 0;
  color: rgb(229 255 195 / 82%);
  font-size: clamp(0.98rem, 1.8vw, 1.12rem);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.015em;
}

@media (min-width: 768px) {
  .hub__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .hub-tile {
    min-height: 500px;
  }

  .hub-tile__art {
    min-height: 320px;
  }
}
</style>
