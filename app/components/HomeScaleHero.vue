<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
const visualRef = useTemplateRef<HTMLElement>('visualRef')

const primaryCta = computed(() =>
  auth.loggedIn.value
    ? { label: t('home.hero_cta_bots'), to: '/bots' }
    : { label: t('home.hero_cta'), to: '/auth/register' },
)

let cleanup: (() => void) | null = null

onMounted(() => {
  const canvasEl = canvasRef.value
  const wrapEl = visualRef.value
  if (!canvasEl || !wrapEl) return

  const ctxRaw = canvasEl.getContext('2d')
  if (!ctxRaw) return

  const canvas = canvasEl
  const wrap = wrapEl
  const ctx = ctxRaw

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let width = 0
  let height = 0
  let raf = 0
  const t0 = performance.now()
  let pointerX = 0
  let pointerY = 0
  let targetX = 0
  let targetY = 0

  type Particle = {
    theta: number
    phi: number
    radius: number
    size: number
    hue: number
    speed: number
  }

  const particles: Particle[] = []
  const count = prefersReducedMotion ? 420 : 900

  for (let i = 0; i < count; i++) {
    const u = Math.random()
    const v = Math.random()
    particles.push({
      theta: 2 * Math.PI * u,
      phi: Math.acos(2 * v - 1),
      radius: 0.55 + Math.random() * 0.45,
      size: 0.6 + Math.random() * 1.8,
      hue: 220 + Math.random() * 80,
      speed: 0.15 + Math.random() * 0.35,
    })
  }

  function resize() {
    const rect = wrap.getBoundingClientRect()
    width = Math.max(320, Math.floor(rect.width))
    height = Math.max(320, Math.floor(rect.height))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function onPointerMove(event: PointerEvent) {
    const rect = wrap.getBoundingClientRect()
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }

  function draw(now: number) {
    const elapsed = (now - t0) / 1000
    pointerX += (targetX - pointerX) * 0.06
    pointerY += (targetY - pointerY) * 0.06

    ctx.clearRect(0, 0, width, height)

    const cx = width * 0.5 + pointerX * 18
    const cy = height * 0.5 + pointerY * 14
    const baseR = Math.min(width, height) * 0.34

    const glow = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 2.1)
    glow.addColorStop(0, 'rgba(147, 112, 255, 0.35)')
    glow.addColorStop(0.35, 'rgba(59, 130, 246, 0.18)')
    glow.addColorStop(0.7, 'rgba(14, 165, 233, 0.06)')
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    const rotY = prefersReducedMotion ? 0.4 : elapsed * 0.22 + pointerX * 0.35
    const rotX = 0.35 + pointerY * 0.25

    const sorted = particles.map((p) => {
      const r = baseR * p.radius
      const x = r * Math.sin(p.phi) * Math.cos(p.theta + rotY * p.speed)
      const y = r * Math.cos(p.phi)
      const z = r * Math.sin(p.phi) * Math.sin(p.theta + rotY * p.speed)

      const y2 = y * Math.cos(rotX) - z * Math.sin(rotX)
      const z2 = y * Math.sin(rotX) + z * Math.cos(rotX)

      return { x, y: y2, z: z2, size: p.size, hue: p.hue }
    }).sort((a, b) => a.z - b.z)

    for (const p of sorted) {
      const depth = (p.z / baseR + 1) * 0.5
      const alpha = 0.15 + depth * 0.85
      const size = p.size * (0.55 + depth * 0.9)
      ctx.beginPath()
      ctx.fillStyle = `hsla(${p.hue}, 90%, ${55 + depth * 25}%, ${alpha})`
      ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${0.35 + depth * 0.4})`
      ctx.shadowBlur = 6 + depth * 10
      ctx.arc(cx + p.x, cy + p.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    raf = requestAnimationFrame(draw)
  }

  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(wrap)
  wrap.addEventListener('pointermove', onPointerMove, { passive: true })
  raf = requestAnimationFrame(draw)

  cleanup = () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    wrap.removeEventListener('pointermove', onPointerMove)
  }
})

onBeforeUnmount(() => {
  cleanup?.()
  cleanup = null
})
</script>

<template>
  <section class="scale-hero">
    <div
      class="scale-hero__atmosphere"
      aria-hidden="true"
    />

    <div class="scale-hero__shell">
      <div class="scale-hero__grid">
        <div class="scale-hero__copy">
          <h1 class="scale-hero__title">
            <span>{{ $t('home.scale_hero_line1') }}</span>
            <span>{{ $t('home.scale_hero_line2') }}</span>
          </h1>
          <p class="scale-hero__subtitle">
            {{ $t('home.scale_hero_subtitle') }}
          </p>
          <div class="scale-hero__actions">
            <AppButton
              variant="inverse"
              size="lg"
              :to="primaryCta.to"
            >
              {{ primaryCta.label }}
            </AppButton>
            <NuxtLink
              class="scale-hero__text-link"
              :to="auth.loggedIn.value ? '/bots/create' : '/bots/overview'"
            >
              {{ $t('home.scale_hero_secondary') }}
              <UIcon name="i-lucide-arrow-up-right" />
            </NuxtLink>
          </div>
        </div>

        <div
          ref="visualRef"
          class="scale-hero__visual"
          aria-hidden="true"
        >
          <canvas
            ref="canvasRef"
            class="scale-hero__canvas"
          />
        </div>
      </div>

      <div class="scale-hero__partners">
        <p class="scale-hero__partners-label">
          {{ $t('home.scale_partners_label') }}
        </p>
        <div class="scale-hero__partners-logos">
          <ExchangeIcon
            exchange="BINANCE"
            size="compact"
          />
          <ExchangeIcon
            exchange="BYBIT"
            size="compact"
          />
          <ExchangeIcon
            exchange="OKX"
            size="compact"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scale-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: min(100svh, 920px);
  padding: clamp(32px, 5vw, 64px) 0 0;
  background: #000;
  color: #fff;
}

.scale-hero__atmosphere {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 50% at 78% 42%, rgb(124 58 237 / 28%), transparent 60%),
    radial-gradient(ellipse 40% 45% at 18% 30%, rgb(37 99 235 / 18%), transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 100%, rgb(14 165 233 / 10%), transparent 50%);
  pointer-events: none;
}

.scale-hero__shell {
  position: relative;
  z-index: 1;
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  gap: clamp(40px, 7vw, 72px);
}

.scale-hero__grid {
  display: grid;
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  min-height: clamp(420px, 58vh, 620px);
}

.scale-hero__copy {
  display: grid;
  gap: 22px;
  max-width: 560px;
  animation: heroRise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.scale-hero__title {
  display: grid;
  gap: 0.08em;
  margin: 0;
  font-size: clamp(3rem, 7.2vw, 5rem);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.scale-hero__subtitle {
  margin: 0;
  max-width: 38ch;
  color: rgb(255 255 255 / 58%);
  font-size: clamp(1.02rem, 1.6vw, 1.18rem);
  line-height: 1.6;
}

.scale-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-top: 6px;
}

.scale-hero__text-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(255 255 255 / 78%);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.scale-hero__text-link:hover {
  color: #fff;
}

.scale-hero__text-link :deep(svg) {
  width: 16px;
  height: 16px;
}

.scale-hero__visual {
  position: relative;
  width: 100%;
  min-height: clamp(320px, 48vw, 540px);
  animation: heroFade 1.2s ease both;
}

.scale-hero__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scale-hero__partners {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px 40px;
  padding: 28px 0 40px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

.scale-hero__partners-label {
  margin: 0;
  color: rgb(255 255 255 / 35%);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scale-hero__partners-logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 36px;
  opacity: 0.45;
  filter: grayscale(1) brightness(1.6);
}

@keyframes heroRise {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes heroFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (min-width: 960px) {
  .scale-hero__grid {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }
}

@media (max-width: 959px) {
  .scale-hero {
    min-height: auto;
  }

  .scale-hero__copy {
    text-align: center;
    justify-items: center;
    max-width: none;
  }

  .scale-hero__subtitle {
    max-width: 42ch;
  }

  .scale-hero__actions {
    justify-content: center;
  }

  .scale-hero__partners {
    justify-content: center;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scale-hero__copy,
  .scale-hero__visual {
    animation: none;
  }
}
</style>
