<script setup lang="ts">
const auth = useAuth()

const settingsLink = computed(() =>
  auth.loggedIn.value ? '/settings#api-keys' : '/auth/login',
)

const ctaTo = computed(() => (auth.loggedIn.value ? '/bots/create' : '/auth/register'))

const steps = computed(() => [
  {
    number: '01',
    icon: 'i-lucide-user-plus',
    titleKey: 'home.step_1_title',
    descKey: 'home.step_1_desc',
    to: '/auth/register',
  },
  {
    number: '02',
    icon: 'i-lucide-key-round',
    titleKey: 'home.step_2_title',
    descKey: 'home.step_2_desc',
    to: settingsLink.value,
  },
  {
    number: '03',
    icon: 'i-lucide-bot',
    titleKey: 'home.step_3_title',
    descKey: 'home.step_3_desc',
    to: auth.loggedIn.value ? '/bots/create' : '/auth/login',
  },
  {
    number: '04',
    icon: 'i-lucide-activity',
    titleKey: 'home.step_4_title',
    descKey: 'home.step_4_desc',
    to: auth.loggedIn.value ? '/bots' : '/bots/overview',
  },
])
</script>

<template>
  <section class="beginner">
    <div class="container">
      <header class="beginner__header">
        <div
          class="beginner__art"
          aria-hidden="true"
        >
          <div class="beginner__blob beginner__blob--1" />
          <div class="beginner__blob beginner__blob--2" />
          <div class="beginner__blob beginner__blob--3" />
        </div>
        <div class="beginner__intro">
          <h2>{{ $t('home.steps_title') }}</h2>
          <p>{{ $t('home.steps_subtitle') }}</p>
          <NuxtLink
            class="beginner__cta"
            :to="ctaTo"
          >
            {{ $t('home.steps_cta') }}
          </NuxtLink>
        </div>
      </header>

      <ol class="beginner__steps">
        <li
          v-for="step in steps"
          :key="step.number"
        >
          <NuxtLink
            :to="step.to"
            class="step"
          >
            <div class="step__top">
              <span class="step__num">{{ step.number }}</span>
              <UIcon
                :name="step.icon"
                class="step__icon"
              />
            </div>
            <h3>{{ $t(step.titleKey) }}</h3>
            <p>{{ $t(step.descKey) }}</p>
          </NuxtLink>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.beginner {
  padding: 80px 0 100px;
  background: #e5ffc3;
  color: #013330;
}

.beginner__header {
  display: grid;
  gap: 32px;
  margin-bottom: 36px;
  align-items: center;
}

.beginner__art {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  min-height: 160px;
}

.beginner__blob {
  border-radius: 24px;
  background: #013330;
}

.beginner__blob--1 {
  background:
    radial-gradient(circle at 40% 40%, rgb(186 242 74 / 50%), transparent 50%),
    #013330;
}

.beginner__blob--2 {
  transform: translateY(14px);
  background:
    radial-gradient(circle at 50% 40%, rgb(206 233 253 / 55%), transparent 50%),
    #013330;
}

.beginner__blob--3 {
  background:
    radial-gradient(circle at 45% 40%, rgb(255 200 120 / 40%), transparent 50%),
    #013330;
}

.beginner__intro h2 {
  margin: 0;
  font-family: "Dela Gothic One", "DM Sans", sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 400;
  line-height: 1.05;
}

.beginner__intro p {
  max-width: 46ch;
  margin: 14px 0 0;
  color: rgb(1 51 48 / 70%);
  font-size: 1.05rem;
  line-height: 1.55;
}

.beginner__cta {
  display: inline-flex;
  margin-top: 22px;
  min-height: 48px;
  align-items: center;
  padding: 0 22px;
  border-radius: 999px;
  background: #013330;
  color: #e5ffc3;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
}

.beginner__steps {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: grid;
  gap: 10px;
  height: 100%;
  padding: 22px;
  border-radius: 24px;
  background: #013330;
  color: #e5ffc3;
  text-decoration: none;
  transition: transform 0.3s ease;
}

.step:hover {
  transform: translateY(-4px);
}

.step__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step__num {
  color: #baf24a;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.step__icon {
  width: 22px;
  height: 22px;
  color: #baf24a;
}

.step h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.step p {
  margin: 0;
  color: rgb(229 255 195 / 75%);
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (min-width: 768px) {
  .beginner__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .beginner__header {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 48px;
  }

  .beginner__blob {
    min-height: 200px;
  }

  .beginner__steps {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
