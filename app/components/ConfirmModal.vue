<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="confirm-modal"
      role="presentation"
      @click.self="onBackdropClick"
    >
      <div
        class="confirm-modal__panel neumo"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <h2 :id="titleId" class="confirm-modal__title">
          {{ title }}
        </h2>
        <p :id="messageId" class="confirm-modal__message">
          {{ message }}
        </p>
        <div class="confirm-modal__actions">
          <NeumoButton
            variant="secondary"
            size="sm"
            :disabled="loading"
            @click="onCancel"
          >
            {{ cancelLabel }}
          </NeumoButton>
          <NeumoButton
            :variant="confirmVariant"
            size="sm"
            :disabled="loading"
            @click="$emit('confirm')"
          >
            {{ loading ? loadingLabel : confirmLabel }}
          </NeumoButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  loadingLabel?: string
  loading?: boolean
  confirmVariant?: 'primary' | 'danger'
  closeOnBackdrop?: boolean
}>(), {
  loading: false,
  confirmVariant: 'primary',
  closeOnBackdrop: true,
  loadingLabel: '...',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const titleId = `confirm-modal-title-${useId()}`
const messageId = `confirm-modal-message-${useId()}`

function onCancel() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) onCancel()
}

function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue || props.loading) return
  if (event.key === 'Escape') onCancel()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
}

.confirm-modal__panel {
  width: min(100%, 420px);
  padding: 24px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.confirm-modal__title {
  margin: 0 0 12px;
  font-size: 1.15rem;
  font-weight: 700;
}

.confirm-modal__message {
  margin: 0 0 24px;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.confirm-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
