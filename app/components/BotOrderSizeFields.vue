<script setup lang="ts">
import { OrderSizeMode } from '#shared/types/bot'
import { baseCoinFromSymbol } from '~/utils/orderSize'

const props = withDefaults(defineProps<{
  symbol: string
  error?: string
  inputId?: string
  /** Narrow layout for the liquidation sidebar: no frame, no hints. */
  compact?: boolean
}>(), {
  error: '',
  inputId: 'bot-order-size',
  compact: false,
})

const mode = defineModel<OrderSizeMode>('mode', { required: true })
const value = defineModel<string>('value', { required: true })

const { t } = useI18n()

const titleId = useId()
const rootRef = useTemplateRef('rootRef')

const modeOptions = computed(() => [
  { mode: OrderSizeMode.Coin, label: t('bots.order_size_mode_coin') },
  { mode: OrderSizeMode.Usdt, label: t('bots.order_size_mode_usdt') },
])

const isUsdt = computed(() => mode.value === OrderSizeMode.Usdt)
const baseCoin = computed(() => baseCoinFromSymbol(props.symbol))

const inputLabel = computed(() => {
  if (isUsdt.value) return t('bots.order_size_label_usdt')

  return baseCoin.value
    ? t('bots.order_size_label_coin', { coin: baseCoin.value })
    : t('bots.order_size_label_coin_generic')
})

const placeholder = computed(() => (
  isUsdt.value
    ? t('bots.order_size_placeholder_usdt')
    : t('bots.order_size_placeholder_coin')
))

function selectMode(next: OrderSizeMode) {
  if (mode.value === next) return

  mode.value = next
  // An amount typed in one unit means nothing in the other
  value.value = ''
}

function reveal() {
  const root = rootRef.value
  if (!root) return

  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
  root.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
}

defineExpose({ reveal })
</script>

<template>
  <div ref="rootRef" class="order-size" :class="{ 'order-size--compact': compact }">
    <div class="order-size__head">
      <span :id="titleId" class="order-size__title">{{ $t('bots.field_order_size') }}</span>

      <UFieldGroup size="sm" role="group" :aria-labelledby="titleId">
        <!-- Slot text, not the `label` prop: the form card recolours `[data-slot="label"]` and hides it on the white button -->
        <AppButton
          v-for="option in modeOptions"
          :key="option.mode"
          type="button"
          :variant="mode === option.mode ? 'primary' : 'secondary'"
          :aria-pressed="mode === option.mode"
          @click="selectMode(option.mode)"
        >
          {{ option.label }}
        </AppButton>
      </UFieldGroup>
    </div>

    <div class="order-size__fields">
      <!-- `''` would be cast to `true` by UFormField's boolean | string prop and light up the input as invalid -->
      <UFormField :label="inputLabel" :error="props.error || undefined">
        <UInput
          :id="inputId"
          v-model="value"
          inputmode="decimal"
          :placeholder="placeholder"
          required
          class="order-size__input"
        />
      </UFormField>

      <template v-if="isUsdt && !compact">
        <p class="order-size__hint">{{ $t('bots.order_size_hint_notional') }}</p>
        <p class="order-size__hint">{{ $t('bots.order_size_hint_rounding') }}</p>
        <p class="order-size__hint">{{ $t('bots.order_size_hint_levels') }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.order-size {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 500;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__input {
    width: 50%;
    max-width: 50%;
  }

  &__hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  &--compact &__fields {
    padding: 0;
    border: 0;
    border-radius: 0;
  }

  &--compact &__input {
    width: 100%;
    max-width: 100%;
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
