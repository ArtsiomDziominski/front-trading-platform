<script setup lang="ts">
const STORAGE_KEY = 'home-promo-dismissed'

const auth = useAuth()
const visible = ref(false)
const ctaTo = computed(() => (auth.loggedIn.value ? '/bots/create' : '/auth/register'))

function dismiss() {
  visible.value = false
  if (import.meta.client) {
    sessionStorage.setItem(STORAGE_KEY, '1')
  }
}

onMounted(() => {
  visible.value = sessionStorage.getItem(STORAGE_KEY) !== '1'
})
</script>

<template>
  <div
    v-if="visible"
    class="promo"
  >
    <NuxtLink
      :to="ctaTo"
      class="promo__link"
    >
      <div
        class="promo__media"
        aria-hidden="true"
      >
        <UIcon
          name="i-lucide-chart-column"
          class="promo__glyph"
        />
      </div>
      <p class="promo__text">
        <span class="promo__badge">UPDATE</span>
        {{ $t('home.promo_text') }}
      </p>
    </NuxtLink>
    <button
      type="button"
      class="promo__dismiss"
      :aria-label="$t('home.promo_dismiss_aria')"
      @click="dismiss"
    >
      <UIcon
        name="i-lucide-x"
        class="promo__dismiss-icon"
      />
    </button>
  </div>
</template>

<style scoped>
.promo {
  position: relative;
  background: #013330;
  color: #e5ffc3;
}

.promo__link {
  display: grid;
  grid-template-columns: minmax(120px, 28vw) 1fr;
  min-height: 120px;
  text-decoration: none;
  color: inherit;
}

.promo__media {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 40% 50%, rgb(186 242 74 / 45%), transparent 50%),
    linear-gradient(135deg, #02635c, #013330);
}

.promo__glyph {
  width: 40px;
  height: 40px;
  color: #e5ffc3;
}

.promo__text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 20px 56px 20px 24px;
  font-size: clamp(1.1rem, 2.4vw, 1.45rem);
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.promo__badge {
  width: fit-content;
  color: #baf24a;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.promo__dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: rgb(229 255 195 / 12%);
  color: #e5ffc3;
  cursor: pointer;
}

.promo__dismiss-icon {
  width: 16px;
  height: 16px;
}

@media (max-width: 720px) {
  .promo__link {
    grid-template-columns: 1fr;
  }

  .promo__media {
    min-height: 88px;
  }
}
</style>
