<script setup lang="ts">
type AppButtonVariant = 'primary' | 'secondary'

const props = withDefaults(defineProps<{
  /**
   * primary — accent fill (CTA)
   * secondary — soft outline (readable on any surface)
   */
  variant?: AppButtonVariant
}>(), {
  variant: 'primary',
})

const uiColor = computed(() => (props.variant === 'primary' ? 'primary' : 'neutral'))
const uiVariant = computed(() => (props.variant === 'primary' ? 'solid' : 'outline'))
</script>

<template>
  <UButton
    class="app-button"
    :class="variant === 'primary' ? 'app-button--primary' : 'app-button--secondary'"
    :color="uiColor"
    :variant="uiVariant"
  >
    <slot />
  </UButton>
</template>

<style scoped>
.app-button.app-button--primary {
  color: #013330 !important;
  background: #baf24a !important;
  --tw-ring-color: transparent !important;
}

.app-button.app-button--primary:hover {
  background: #d4ff6a !important;
}

.app-button.app-button--secondary {
  color: #013330 !important;
  background: #fff !important;
  --tw-ring-color: rgb(1 51 48 / 28%) !important;
}

.app-button.app-button--secondary:hover {
  background: #f3f7ea !important;
  --tw-ring-color: rgb(1 51 48 / 40%) !important;
}
</style>
