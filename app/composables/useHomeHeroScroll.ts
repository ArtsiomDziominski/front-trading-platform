/**
 * Scroll progress for MetaMask-style sticky hero (0..1 across the tall track).
 */
export function useHomeHeroScroll(
  trackRef: Readonly<Ref<HTMLElement | null | undefined>>,
) {
  const progress = ref(0)

  function update() {
    const el = trackRef.value
    if (!el) {
      return
    }

    const rect = el.getBoundingClientRect()
    const total = el.offsetHeight - window.innerHeight
    if (total <= 0) {
      progress.value = 0
      return
    }

    const scrolled = Math.min(Math.max(-rect.top, 0), total)
    progress.value = scrolled / total
  }

  onMounted(() => {
    nextTick(() => {
      update()
      requestAnimationFrame(update)
    })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  })

  watch(trackRef, () => {
    nextTick(update)
  })

  return { progress }
}
