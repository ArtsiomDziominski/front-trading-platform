<script setup lang="ts">
import type { AntiMartingaleOrderLevel } from '#shared/types/bot'

const MAX_ORDERS = 10
const MIN_ORDERS = 1

const orders = defineModel<AntiMartingaleOrderLevel[]>('orders', { required: true })

defineProps<{
  error?: string
}>()

const canAdd = computed(() => orders.value.length < MAX_ORDERS)
const canRemove = computed(() => orders.value.length > MIN_ORDERS)

function addRow() {
  if (!canAdd.value) return
  orders.value = [...orders.value, { trigger_percent: '', size_percent: '' }]
}

function removeRow(index: number) {
  if (!canRemove.value) return
  orders.value = orders.value.filter((_, i) => i !== index)
}

function updateTrigger(index: number, value: string) {
  const next = [...orders.value]
  const row = next[index]
  if (!row) return
  next[index] = { ...row, trigger_percent: value }
  orders.value = next
}

function updateSize(index: number, value: string) {
  const next = [...orders.value]
  const row = next[index]
  if (!row) return
  next[index] = { ...row, size_percent: value }
  orders.value = next
}
</script>

<template>
  <UFormField :label="$t('bots.field_orders')">
    <div class="orders-table">
      <div
        v-for="(order, index) in orders"
        :key="index"
        class="orders-row"
      >
        <template v-if="index === 0">
          <span class="orders-row__first-label">{{ $t('bots.orders_first_row_label') }}</span>
          <UInput
            :model-value="order.size_percent"
            inputmode="decimal"
            :placeholder="$t('bots.field_size_percent')"
            class="orders-row__size"
            @update:model-value="(value: string | number) => updateSize(index, String(value))"
          />
        </template>

        <template v-else>
          <UInput
            :model-value="order.trigger_percent"
            inputmode="decimal"
            :placeholder="$t('bots.field_trigger_percent')"
            class="orders-row__trigger"
            @update:model-value="(value: string | number) => updateTrigger(index, String(value))"
          />
          <UInput
            :model-value="order.size_percent"
            inputmode="decimal"
            :placeholder="$t('bots.field_size_percent')"
            class="orders-row__size"
            @update:model-value="(value: string | number) => updateSize(index, String(value))"
          />
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            square
            :disabled="!canRemove"
            :aria-label="$t('bots.orders_remove_row')"
            @click="removeRow(index)"
          >
            <UIcon name="i-lucide-trash-2" />
          </AppButton>
        </template>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        :disabled="!canAdd"
        class="orders-add"
        @click="addRow"
      >
        + {{ $t('bots.orders_add_row') }}
      </AppButton>
    </div>

    <template #hint>
      {{ $t('bots.field_orders_hint') }}
    </template>

    <template v-if="error" #error>
      {{ error }}
    </template>
  </UFormField>
</template>

<style scoped>
.orders-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.orders-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  align-items: center;
  gap: 10px;
}

.orders-row__first-label {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.orders-row__trigger,
.orders-row__size {
  width: 100%;
}

.orders-add {
  align-self: flex-start;
}

@media (max-width: 640px) {
  .orders-row {
    grid-template-columns: 1fr 1fr auto;
  }

  .orders-row__first-label {
    grid-column: 1 / -1;
  }
}
</style>
