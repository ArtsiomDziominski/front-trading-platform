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

const confirmColor = computed(() => (props.confirmVariant === 'danger' ? 'error' : 'primary'))

function onCancel() {
  if (props.loading) return
  open.value = false
  emit('cancel')
}
</script>

<template>
  <UModal
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
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        class="w-full justify-center min-h-11 sm:w-auto sm:min-h-0"
        :disabled="loading"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </UButton>
      <UButton
        :color="confirmColor"
        size="sm"
        class="w-full justify-center min-h-11 sm:w-auto sm:min-h-0"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ loading ? loadingLabel : confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>
