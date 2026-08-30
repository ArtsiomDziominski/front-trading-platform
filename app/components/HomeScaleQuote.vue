<template>
  <section class="scale-quote">
    <div class="scale-quote__shell">
      <blockquote class="scale-quote__card">
        <div class="scale-quote__brand">
          <div class="scale-quote__mark">
            <UIcon name="i-lucide-bot" />
          </div>
          <span>Bot Platform</span>
        </div>
        <div class="scale-quote__body">
          <p>«{{ $t('home.scale_quote_text') }}»</p>
          <footer>
            <strong>{{ $t('home.scale_quote_author') }}</strong>
            <span>{{ $t('home.scale_quote_role') }}</span>
          </footer>
        </div>
      </blockquote>
    </div>
  </section>
</template>

<style scoped>
.scale-quote {
  padding: clamp(40px, 7vw, 80px) 0;
  background: #000;
  color: #fff;
}

.scale-quote__shell {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
}

.scale-quote__card {
  display: grid;
  gap: 28px;
  margin: 0;
  padding: clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px);
  border-radius: 24px;
  background:
    linear-gradient(160deg, rgb(255 255 255 / 5.5%) 0%, rgb(255 255 255 / 2%) 100%);
  border: 1px solid rgb(255 255 255 / 9%);
}

.scale-quote__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(255 255 255 / 72%);
  font-size: 0.95rem;
  font-weight: 700;
}

.scale-quote__mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(129 140 248 / 35%), rgb(168 85 247 / 25%));
  color: #ddd6fe;
}

.scale-quote__mark :deep(svg) {
  width: 20px;
  height: 20px;
}

.scale-quote__body p {
  margin: 0;
  max-width: 48ch;
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: -0.015em;
}

.scale-quote__body footer {
  display: grid;
  gap: 4px;
  margin-top: 24px;
  font-style: normal;
}

.scale-quote__body strong {
  font-size: 0.95rem;
}

.scale-quote__body span {
  color: rgb(255 255 255 / 45%);
  font-size: 0.88rem;
}

@media (min-width: 900px) {
  .scale-quote__card {
    grid-template-columns: 220px 1fr;
    align-items: start;
    gap: 48px;
  }
}
</style>
