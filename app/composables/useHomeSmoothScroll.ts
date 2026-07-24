import Lenis from 'lenis'

/**
 * Apple-like inertia scrolling for the homepage only.
 * No-ops when the user prefers reduced motion.
 */
export function useHomeSmoothScroll() {
  let lenis: Lenis | null = null
  let frameId = 0

  onMounted(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      return
    }

    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.1,
    })

    function raf(time: number) {
      lenis?.raf(time)
      frameId = requestAnimationFrame(raf)
    }

    frameId = requestAnimationFrame(raf)
    document.documentElement.classList.add('home-smooth-scroll')
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frameId)
    lenis?.destroy()
    lenis = null
    document.documentElement.classList.remove('home-smooth-scroll')
  })
}
