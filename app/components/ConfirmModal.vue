<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  loadingLabel?: string
  loading?: boolean
  /** Kept for callers; confirm action always uses primary AppButton. */
  confirmVariant?: 'primary' | 'danger'
}>(), {
  loading: false,
  confirmVariant: 'primary',
  loadingLabel: '...',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onCancel() {
  if (props.loading) return
  open.value = false
  emit('cancel')
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="title"
    :dismissible="!loading"
    :close="false"
    :ui="{ footer: 'flex-col-reverse gap-2 sm:flex-row sm:justify-end' }"
  >
    <template #body>
      <p class="text-muted text-sm leading-relaxed">
        {{ message }}
      </p>
    </template>

    <template #footer>
      <AppButton
        variant="secondary"
        size="sm"
        class="w-full justify-center min-h-11 sm:w-auto sm:min-h-0"
        :disabled="loading"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        variant="primary"
        size="sm"
        class="w-full justify-center min-h-11 sm:w-auto sm:min-h-0"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ loading ? loadingLabel : confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
