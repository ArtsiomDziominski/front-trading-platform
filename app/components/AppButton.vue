<script setup lang="ts">
defineOptions({ inheritAttrs: false })

type AppButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost'

const props = withDefaults(defineProps<{
  /**
   * primary / inverse — white fill CTA for dark theme
   * secondary / ghost — transparent outline on dark surfaces
   */
  variant?: AppButtonVariant
}>(), {
  variant: 'primary',
})

const attrs = useAttrs()

const resolvedVariant = computed(() => {
  if (props.variant === 'inverse') return 'primary'
  if (props.variant === 'ghost') return 'secondary'
  return props.variant
})

const uiColor = computed(() => {
  if (resolvedVariant.value === 'primary') return 'primary'
  return 'neutral'
})

const uiVariant = computed(() => {
  if (resolvedVariant.value === 'primary') return 'solid'
  return 'outline'
})
</script>

<template>
  <UButton
    v-bind="attrs"
    class="app-button"
    :class="`app-button--${resolvedVariant}`"
    :color="uiColor"
    :variant="uiVariant"
  >
    <slot />
  </UButton>
</template>

<style scoped>
.app-button.app-button--primary {
  color: #000 !important;
  background: #fff !important;
  --tw-ring-color: transparent !important;
}

.app-button.app-button--primary:hover {
  background: rgb(255 255 255 / 88%) !important;
}

.app-button.app-button--secondary {
  color: #fff !important;
  background: transparent !important;
  --tw-ring-color: rgb(255 255 255 / 30%) !important;
}

.app-button.app-button--secondary:hover {
  background: rgb(255 255 255 / 8%) !important;
  --tw-ring-color: rgb(255 255 255 / 45%) !important;
}
</style>
