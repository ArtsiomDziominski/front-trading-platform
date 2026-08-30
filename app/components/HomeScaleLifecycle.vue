<script setup lang="ts">
const steps = [
  { icon: 'i-lucide-plug', titleKey: 'home.lifecycle_connect', tone: 'a' },
  { icon: 'i-lucide-key-round', titleKey: 'home.lifecycle_configure', tone: 'b' },
  { icon: 'i-lucide-bot', titleKey: 'home.lifecycle_create', tone: 'c' },
  { icon: 'i-lucide-activity', titleKey: 'home.lifecycle_monitor', tone: 'd' },
  { icon: 'i-lucide-rocket', titleKey: 'home.lifecycle_trade', tone: 'e' },
] as const
</script>

<template>
  <section class="scale-lifecycle">
    <div class="scale-lifecycle__shell">
      <header class="scale-lifecycle__header">
        <h2>{{ $t('home.lifecycle_title') }}</h2>
      </header>

      <ol class="scale-lifecycle__rail">
        <li
          v-for="step in steps"
          :key="step.titleKey"
          class="scale-lifecycle__step"
          :class="`scale-lifecycle__step--${step.tone}`"
        >
          <div
            class="scale-lifecycle__hex"
            aria-hidden="true"
          >
            <UIcon
              :name="step.icon"
              class="scale-lifecycle__icon"
            />
          </div>
          <span>{{ $t(step.titleKey) }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.scale-lifecycle {
  padding: clamp(64px, 9vw, 112px) 0;
  background: #000;
  color: #fff;
}

.scale-lifecycle__shell {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
}

.scale-lifecycle__header {
  margin-bottom: 48px;
  text-align: center;
}

.scale-lifecycle__header h2 {
  margin: 0;
  font-size: clamp(1.85rem, 3.8vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.scale-lifecycle__rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.scale-lifecycle__step {
  position: relative;
  display: grid;
  gap: 14px;
  justify-items: center;
  min-height: 132px;
  padding: 28px 12px 22px;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 6%), rgb(255 255 255 / 2%));
  border: 1px solid rgb(255 255 255 / 8%);
  text-align: center;
}

.scale-lifecycle__step:first-child {
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%);
}

.scale-lifecycle__step:last-child {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 18px 50%);
}

.scale-lifecycle__hex {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%);
  background: linear-gradient(145deg, rgb(129 140 248 / 55%), rgb(168 85 247 / 35%));
  box-shadow: 0 0 28px rgb(129 140 248 / 35%);
}

.scale-lifecycle__step--a .scale-lifecycle__hex {
  background: linear-gradient(145deg, #60a5fa, #818cf8);
}

.scale-lifecycle__step--b .scale-lifecycle__hex {
  background: linear-gradient(145deg, #818cf8, #a78bfa);
}

.scale-lifecycle__step--c .scale-lifecycle__hex {
  background: linear-gradient(145deg, #a78bfa, #c084fc);
}

.scale-lifecycle__step--d .scale-lifecycle__hex {
  background: linear-gradient(145deg, #c084fc, #e879f9);
}

.scale-lifecycle__step--e .scale-lifecycle__hex {
  background: linear-gradient(145deg, #38bdf8, #818cf8);
}

.scale-lifecycle__icon {
  width: 22px;
  height: 22px;
  color: #fff;
  filter: drop-shadow(0 0 8px rgb(255 255 255 / 45%));
}

.scale-lifecycle__step span {
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

@media (max-width: 900px) {
  .scale-lifecycle__rail {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .scale-lifecycle__step,
  .scale-lifecycle__step:first-child,
  .scale-lifecycle__step:last-child {
    clip-path: none;
    border-radius: 16px;
    min-height: auto;
    grid-template-columns: auto 1fr;
    justify-items: start;
    align-items: center;
    padding: 16px 18px;
    text-align: left;
  }
}
</style>
