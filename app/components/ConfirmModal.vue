<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  loadingLabel?: string
  loading?: boolean
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

const isDanger = computed(() => props.confirmVariant === 'danger')

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
        v-if="isDanger"
        variant="secondary"
        size="sm"
        class="confirm-modal__danger w-full justify-center min-h-11 sm:w-auto sm:min-h-0"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ loading ? loadingLabel : confirmLabel }}
      </AppButton>
      <AppButton
        v-else
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

<style scoped>
:deep(.confirm-modal__danger.app-button),
:deep(.confirm-modal__danger.app-button--secondary) {
  color: #fff !important;
  background: #dc2626 !important;
  --tw-ring-color: transparent !important;
}

:deep(.confirm-modal__danger.app-button:hover),
:deep(.confirm-modal__danger.app-button--secondary:hover) {
  background: #b91c1c !important;
  color: #fff !important;
}
</style>
