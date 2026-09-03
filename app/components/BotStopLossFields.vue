<script setup lang="ts">
import { StopLossMode } from '#shared/types/bot'

const props = defineProps<{
  error?: string
}>()

const mode = defineModel<StopLossMode>('mode', { required: true })
const value = defineModel<string>('value', { required: true })

const { t } = useI18n()

const rootRef = useTemplateRef('rootRef')

const enabled = computed({
  get: () => mode.value !== StopLossMode.Off,
  set: (on: boolean) => {
    if (on) {
      if (mode.value === StopLossMode.Off) mode.value = StopLossMode.Percent
      return
    }

    mode.value = StopLossMode.Off
    value.value = ''
  },
})

function focusValueInput() {
  rootRef.value?.querySelector<HTMLInputElement>('input')?.focus()
}

watch(enabled, async (isOn) => {
  if (!isOn) return
  await nextTick()
  focusValueInput()
}, { immediate: true })
</script>

<template>
  <div ref="rootRef" class="stop-loss">
    <UCheckbox
      v-model="enabled"
      :label="$t('bots.stop_loss_title')"
    />

    <div v-if="enabled" class="stop-loss__fields">
      <UFormField
        :label="$t('bots.stop_loss_value')"
        :error="props.error"
      >
        <UInput
          id="bot-stop-loss-value"
          v-model="value"
          inputmode="decimal"
          :placeholder="t('bots.stop_loss_placeholder_percent')"
          class="stop-loss__input"
        >
          <template #trailing>
            <span class="stop-loss__unit" aria-hidden="true">%</span>
          </template>
        </UInput>
      </UFormField>

      <p class="stop-loss__how">{{ $t('bots.stop_loss_hint_how') }}</p>
      <p class="stop-loss__how">{{ $t('bots.stop_loss_hint_restart') }}</p>
      <p class="stop-loss__how">{{ $t('bots.stop_loss_hint_telegram') }}</p>
    </div>

    <UAlert
      v-else-if="props.error"
      color="error"
      variant="subtle"
      :title="props.error"
    />
  </div>
</template>

<style scoped lang="scss">
.stop-loss {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__how {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  &__unit {
    min-width: 2.75rem;
    color: var(--color-accent);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
    text-align: center;
  }

  &__input {
    width: 50%;
    max-width: 50%;
  }

  @media (max-width: 640px) {
    &__fields {
      padding: 14px;
    }

    &__input {
      width: 100%;
      max-width: 100%;
    }
  }
}
</style>
