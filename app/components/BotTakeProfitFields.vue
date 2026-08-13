<script setup lang="ts">
import { TakeProfitMode } from '#shared/types/bot'

const props = defineProps<{
  error?: string
}>()

const mode = defineModel<TakeProfitMode>('mode', { required: true })
const value = defineModel<string>('value', { required: true })

const { t } = useI18n()

const UNIT_HINT_MS = 5000

const rootRef = useTemplateRef('rootRef')
const unitHintOpen = ref(false)
let unitHintTimer: ReturnType<typeof setTimeout> | null = null

const enabled = computed({
  get: () => mode.value !== TakeProfitMode.Off,
  set: (on: boolean) => {
    if (on) {
      if (mode.value === TakeProfitMode.Off) mode.value = TakeProfitMode.Percent
      return
    }

    mode.value = TakeProfitMode.Off
    value.value = ''
  },
})

const unitLabel = computed(() => (mode.value === TakeProfitMode.Amount ? 'USDT' : '%'))

const placeholder = computed(() => (
  mode.value === TakeProfitMode.Amount
    ? t('bots.take_profit_placeholder_amount')
    : t('bots.take_profit_placeholder_percent')
))

function clearUnitHintTimer() {
  if (!unitHintTimer) return
  clearTimeout(unitHintTimer)
  unitHintTimer = null
}

function hideUnitHint() {
  clearUnitHintTimer()
  unitHintOpen.value = false
}

function showUnitHint() {
  clearUnitHintTimer()
  unitHintOpen.value = true
  unitHintTimer = setTimeout(() => {
    unitHintOpen.value = false
    unitHintTimer = null
  }, UNIT_HINT_MS)
}

function toggleUnit() {
  mode.value = mode.value === TakeProfitMode.Amount
    ? TakeProfitMode.Percent
    : TakeProfitMode.Amount
}

function focusValueInput() {
  rootRef.value?.querySelector<HTMLInputElement>('input')?.focus()
}

watch(enabled, async (isOn) => {
  if (!isOn) {
    hideUnitHint()
    return
  }

  await nextTick()
  focusValueInput()
  showUnitHint()
}, { immediate: true })

onUnmounted(hideUnitHint)
</script>

<template>
  <div ref="rootRef" class="take-profit">
    <UCheckbox
      v-model="enabled"
      :label="$t('bots.take_profit_title')"
    />

    <div v-if="enabled" class="take-profit__fields">
      <UFormField
        :label="$t('bots.take_profit_value')"
        :error="props.error"
      >
        <UInput
          id="bot-take-profit-value"
          v-model="value"
          inputmode="decimal"
          :placeholder="placeholder"
          class="take-profit__input"
        >
          <template #trailing>
            <UTooltip
              v-model:open="unitHintOpen"
              :text="$t('bots.take_profit_unit_hint')"
              :delay-duration="0"
              :content="{ side: 'top', sideOffset: 8 }"
            >
              <button
                type="button"
                class="take-profit__unit"
                :aria-label="$t('bots.take_profit_unit_toggle', { unit: unitLabel })"
                @click.stop="toggleUnit"
              >
                {{ unitLabel }}
              </button>
            </UTooltip>
          </template>
        </UInput>
      </UFormField>

      <p class="take-profit__how">{{ $t('bots.take_profit_hint_how') }}</p>
      <p class="take-profit__how">{{ $t('bots.take_profit_hint_restart') }}</p>
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
.take-profit {
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
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    color: #013330;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
    cursor: pointer;
  }

  &__unit:hover {
    color: #0a5c56;
  }

  &__input {
    width: 50%;
    max-width: 50%;

    :deep([data-slot='trailing']) {
      pointer-events: auto;
    }
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
