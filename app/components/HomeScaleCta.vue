<script setup lang="ts">
const auth = useAuth()
</script>

<template>
  <section class="scale-cta">
    <div
      class="scale-cta__atmosphere"
      aria-hidden="true"
    />
    <div class="scale-cta__shell">
      <h2>{{ $t('home.scale_cta_title') }}</h2>
      <p>{{ $t('home.scale_cta_subtitle') }}</p>
      <div class="scale-cta__actions">
        <AppButton
          variant="inverse"
          size="lg"
          :to="auth.loggedIn.value ? '/bots/create' : '/auth/register'"
        >
          {{ $t('home.cta_button') }}
        </AppButton>
        <AppButton
          v-if="!auth.loggedIn.value"
          variant="ghost"
          size="lg"
          to="/auth/login"
        >
          {{ $t('home.cta_login') }}
        </AppButton>
      </div>
      <p class="scale-cta__note">
        {{ $t('home.cta_note') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.scale-cta {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(96px, 14vw, 160px) 0;
  background: #000;
  color: #fff;
}

.scale-cta__atmosphere {
  position: absolute;
  inset: auto 0 -40% 0;
  height: 90%;
  background:
    radial-gradient(ellipse 60% 55% at 50% 40%, rgb(124 58 237 / 28%), transparent 65%),
    radial-gradient(ellipse 40% 40% at 30% 60%, rgb(37 99 235 / 18%), transparent 60%);
  pointer-events: none;
}

.scale-cta__shell {
  position: relative;
  width: min(760px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  justify-items: center;
  gap: 18px;
  text-align: center;
}

.scale-cta__shell h2 {
  margin: 0;
  max-width: 14ch;
  font-size: clamp(2.3rem, 5.5vw, 3.6rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.scale-cta__shell > p:not(.scale-cta__note) {
  max-width: 40ch;
  margin: 0;
  color: rgb(255 255 255 / 55%);
  font-size: 1.08rem;
  line-height: 1.55;
}

.scale-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
}

.scale-cta__note {
  margin: 6px 0 0;
  color: rgb(255 255 255 / 35%);
  font-size: 0.88rem;
}
</style>
