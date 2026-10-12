<script setup lang="ts">
import type { GridCycleState, GridDirection, GridOrderUnit, GridProgressionType } from '#shared/types/bot'
import {
  applyFixedOrders,
  applyProgression,
  fixedOrdersCount,
  MIXED_GRID_MAX_ORDERS,
  orderNotionalUsdt,
  orderPrices,
  progressionStartOrder,
  resizeOrders,
  totalNotionalUsdt,
  type MixedGridForm,
} from '~/utils/mixedGrid'

const props = withDefaults(defineProps<{
  direction: GridDirection
  /** Default step for orders without their own, % (`grid_step_percent`). */
  gridStep: string
  /** Shows the level prices when the grid has a start price. */
  startPrice?: string
  error?: string
  /** Edit modal: deposit and snapshot of the running cycle. */
  cycleState?: GridCycleState | null
  cycleInProgress?: boolean
}>(), {
  startPrice: '',
  error: '',
  cycleState: null,
  cycleInProgress: false,
})

const form = defineModel<MixedGridForm>('form', { required: true })

const { t } = useI18n()
const rootRef = useTemplateRef('rootRef')

const usdtFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const priceFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })

const unitItems = computed(() => [
  { label: 'USDT', value: 'USDT' as GridOrderUnit },
  { label: t('bots.mixed_unit_percent'), value: 'PERCENT' as GridOrderUnit },
])

const progressionItems = computed(() => [
  { label: t('bots.mixed_progression_arithmetic'), value: 'arithmetic' as GridProgressionType },
  { label: t('bots.mixed_progression_geometric'), value: 'geometric' as GridProgressionType },
  { label: t('bots.mixed_progression_none'), value: 'none' as GridProgressionType },
])

function parse(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const fixedCount = computed(() => fixedOrdersCount(form.value))
const startOrder = computed(() => progressionStartOrder(form.value))
const hasGrid = computed(() => startOrder.value <= form.value.orders.length)

/** The next cycle sizes % orders from the compounded deposit unless the deposit field was changed. */
const nextDeposit = computed(() => {
  const typed = parse(form.value.deposit)
  const state = props.cycleState
  if (state?.deposit_usdt != null && state.deposit_source_usdt != null && typed != null
    && Number(state.deposit_source_usdt) === typed) {
    return Number(state.deposit_usdt)
  }
  return typed
})

const activeCycle = computed(() => (props.cycleInProgress ? props.cycleState?.cycle ?? null : null))

const notionals = computed(() => form.value.orders.map((row) => orderNotionalUsdt(row, nextDeposit.value)))
const total = computed(() => totalNotionalUsdt(form.value, nextDeposit.value))
const prices = computed(() => orderPrices(form.value, parse(props.startPrice), props.direction, props.gridStep))
const showPrices = computed(() => prices.value.some((price) => price != null))

function formatUsdt(value: number | null | undefined): string {
  return value == null ? '—' : usdtFormatter.format(value)
}

function rowKind(index: number): string {
  if (index === 0) return t('bots.mixed_kind_entry')
  return index < fixedCount.value ? t('bots.mixed_kind_fixed') : t('bots.mixed_kind_grid')
}

function onTotalOrdersChange() {
  form.value.orders = resizeOrders(form.value)
}

function fillFixed() {
  form.value.orders = applyFixedOrders(form.value)
  form.value.totalOrders = String(form.value.orders.length)
}

function fillProgression() {
  form.value.orders = applyProgression(form.value)
  form.value.totalOrders = String(form.value.orders.length)
}

function reveal() {
  rootRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ reveal })
</script>

<template>
  <div ref="rootRef" class="mixed-grid">
    <div class="mixed-grid__section">
      <UFormField :label="$t('bots.mixed_deposit')">
        <UInput v-model="form.deposit" inputmode="decimal" placeholder="2000" class="mixed-grid__input">
          <template #trailing>USDT</template>
        </UInput>
        <template #hint>{{ $t('bots.mixed_deposit_hint') }}</template>
      </UFormField>

      <p v-if="activeCycle" class="mixed-grid__note" role="status">
        {{ $t('bots.mixed_cycle_running', {
          deposit: formatUsdt(Number(activeCycle.base_deposit_usdt)),
          total: formatUsdt(Number(activeCycle.total_notional_usdt)),
        }) }}
      </p>
      <p v-if="cycleState?.deposit_usdt" class="mixed-grid__note">
        {{ $t('bots.mixed_next_deposit', { deposit: formatUsdt(nextDeposit) }) }}
      </p>
    </div>

    <fieldset class="mixed-grid__section mixed-grid__box">
      <legend class="mixed-grid__legend">{{ $t('bots.mixed_fixed_title') }}</legend>
      <div class="mixed-grid__row">
        <UFormField :label="$t('bots.mixed_fixed_count')">
          <UInput v-model="form.fixedCount" inputmode="numeric" placeholder="0" class="w-full" />
        </UFormField>
        <UFormField :label="$t('bots.mixed_fixed_usdt')">
          <UInput v-model="form.fixedUsdt" inputmode="decimal" placeholder="1" :disabled="fixedCount === 0" class="w-full">
            <template #trailing>USDT</template>
          </UInput>
        </UFormField>
      </div>
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        class="mixed-grid__apply"
        :disabled="fixedCount === 0"
        @click="fillFixed"
      >
        {{ $t('bots.mixed_fixed_apply', { count: fixedCount }) }}
      </AppButton>
    </fieldset>

    <fieldset class="mixed-grid__section mixed-grid__box">
      <legend class="mixed-grid__legend">{{ $t('bots.mixed_grid_title', { start: startOrder }) }}</legend>
      <div class="mixed-grid__row">
        <UFormField :label="$t('bots.mixed_total_orders')">
          <UInput
            v-model="form.totalOrders"
            inputmode="numeric"
            :placeholder="`2…${MIXED_GRID_MAX_ORDERS}`"
            class="w-full"
            @change="onTotalOrdersChange"
            @blur="onTotalOrdersChange"
          />
        </UFormField>
        <UFormField :label="$t('bots.mixed_start_order')">
          <UInput :model-value="String(startOrder)" disabled class="w-full" />
          <template #hint>{{ $t('bots.mixed_start_order_hint') }}</template>
        </UFormField>
      </div>

      <div class="mixed-grid__row">
        <UFormField :label="$t('bots.mixed_progression')">
          <USelect v-model="form.progressionType" :items="progressionItems" class="w-full" />
        </UFormField>
        <UFormField :label="$t('bots.mixed_unit')">
          <USelect v-model="form.unit" :items="unitItems" class="w-full" />
        </UFormField>
      </div>

      <div class="mixed-grid__row">
        <UFormField :label="$t('bots.mixed_start_value')">
          <UInput v-model="form.startValue" inputmode="decimal" placeholder="5" class="w-full">
            <template #trailing>{{ form.unit === 'PERCENT' ? '%' : 'USDT' }}</template>
          </UInput>
        </UFormField>
        <UFormField v-if="form.progressionType === 'arithmetic'" :label="$t('bots.mixed_increment')">
          <UInput v-model="form.increment" inputmode="decimal" placeholder="5" class="w-full">
            <template #trailing>{{ form.unit === 'PERCENT' ? $t('bots.mixed_pp') : 'USDT' }}</template>
          </UInput>
        </UFormField>
        <UFormField v-else-if="form.progressionType === 'geometric'" :label="$t('bots.mixed_ratio')">
          <UInput v-model="form.ratio" inputmode="decimal" placeholder="2" class="w-full">
            <template #leading>×</template>
          </UInput>
        </UFormField>
      </div>

      <UFormField :label="$t('bots.mixed_step')">
        <UInput v-model="form.step" inputmode="decimal" :placeholder="gridStep" class="mixed-grid__input">
          <template #trailing>%</template>
        </UInput>
        <template #hint>{{ $t('bots.mixed_step_hint') }}</template>
      </UFormField>

      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        class="mixed-grid__apply"
        :disabled="!hasGrid"
        @click="fillProgression"
      >
        {{ $t('bots.mixed_progression_apply', { start: startOrder }) }}
      </AppButton>
      <p class="mixed-grid__hint">{{ $t('bots.mixed_progression_hint') }}</p>
    </fieldset>

    <div class="mixed-grid__table-wrap">
      <table class="mixed-grid__table">
        <thead>
          <tr>
            <th>№</th>
            <th>{{ $t('bots.mixed_col_size') }}</th>
            <th>{{ $t('bots.mixed_col_unit') }}</th>
            <th>{{ $t('bots.mixed_col_step') }}</th>
            <th class="mixed-grid__num">{{ $t('bots.mixed_col_notional') }}</th>
            <th v-if="showPrices" class="mixed-grid__num">{{ $t('bots.mixed_col_price') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in form.orders" :key="index">
            <td>
              <span class="mixed-grid__number">{{ index + 1 }}</span>
              <span class="mixed-grid__kind">{{ rowKind(index) }}</span>
            </td>
            <td :data-label="$t('bots.mixed_col_size')">
              <UInput
                v-model="row.size"
                inputmode="decimal"
                size="sm"
                :aria-label="$t('bots.mixed_col_size_n', { number: index + 1 })"
                class="mixed-grid__cell-input"
              />
            </td>
            <td :data-label="$t('bots.mixed_col_unit')">
              <USelect v-model="row.unit" :items="unitItems" size="sm" class="mixed-grid__cell-select" />
            </td>
            <td :data-label="$t('bots.mixed_col_step')">
              <UInput
                v-if="index < form.orders.length - 1"
                v-model="row.step"
                inputmode="decimal"
                size="sm"
                :placeholder="gridStep"
                :aria-label="$t('bots.mixed_col_step_n', { number: index + 1 })"
                class="mixed-grid__cell-input"
              />
              <span v-else class="mixed-grid__muted">—</span>
            </td>
            <td class="mixed-grid__num mixed-grid__notional" :data-label="$t('bots.mixed_col_notional')">{{ formatUsdt(notionals[index]) }}</td>
            <td v-if="showPrices" class="mixed-grid__num mixed-grid__price" :data-label="$t('bots.mixed_col_price')">
              {{ prices[index] == null ? '—' : priceFormatter.format(prices[index] as number) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dl class="mixed-grid__summary">
      <div>
        <dt>{{ $t('bots.mixed_base_deposit') }}</dt>
        <dd>{{ formatUsdt(nextDeposit) }} USDT</dd>
      </div>
      <div>
        <dt>{{ $t('bots.mixed_total_notional') }}</dt>
        <dd>{{ formatUsdt(total) }} USDT</dd>
      </div>
    </dl>
    <p class="mixed-grid__hint">{{ $t('bots.mixed_notional_hint') }}</p>
    <p class="mixed-grid__hint">{{ $t('bots.mixed_minimum_hint') }}</p>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />
  </div>
</template>

<style scoped lang="scss">
.mixed-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  &__box {
    margin: 0;
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__legend {
    padding: 0 6px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
  }

  &__input {
    width: 50%;
    max-width: 50%;
  }

  &__apply {
    align-self: flex-start;
  }

  &__note {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    color: var(--color-accent);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  &__hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  &__table-wrap {
    max-height: 420px;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;

    th,
    td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface-muted);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    tr:last-child td {
      border-bottom: 0;
    }
  }

  &__num {
    text-align: right !important;
    font-variant-numeric: tabular-nums;
  }

  &__number {
    font-weight: 600;
  }

  &__kind {
    display: block;
    color: var(--color-text-muted);
    font-size: 0.72rem;
  }

  &__muted {
    color: var(--color-text-muted);
  }

  &__cell-input {
    width: 96px;
  }

  &__cell-select {
    width: 130px;
  }

  &__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin: 0;

    div {
      display: flex;
      gap: 6px;
      align-items: baseline;
    }

    dt {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    dd {
      margin: 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }

  @media (max-width: 640px) {
    &__row {
      grid-template-columns: 1fr;
    }

    &__input {
      width: 100%;
      max-width: 100%;
    }

    /* Phones: each order is a small card — number and amount on top, the three inputs under their labels */
    &__table-wrap {
      max-height: none;
      overflow: visible;
    }

    &__table {
      display: block;

      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }

      tbody {
        display: block;
      }

      tr {
        display: grid;
        /* Middle column fits the unit select so "% депозита" is never cut */
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 6px 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--color-border);
      }

      tr:last-child {
        border-bottom: 0;
      }

      td,
      tr:last-child td {
        display: block;
        min-width: 0;
        padding: 0;
        border: 0;
        white-space: normal;
      }

      td[data-label]::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 2px;
        color: var(--color-text-muted);
        font-size: 0.72rem;
      }

      tr td:first-child {
        grid-column: 1;
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
    }

    &__notional {
      grid-row: 1;
      grid-column: 2 / -1;
      white-space: nowrap !important;
    }

    &__price {
      grid-column: 1 / -1;
      display: flex !important;
      justify-content: space-between;

      &::before {
        margin: 0 !important;
      }
    }

    &__kind {
      display: inline;
    }

    &__cell-input {
      width: 100%;
    }

    /* USelect renders a Reka trigger without the scoped attribute, so reach it with :deep */
    :deep(.mixed-grid__cell-select) {
      width: auto;
      min-width: 92px;
    }

    &__notional::before {
      content: none !important;
    }

    &__notional::after {
      content: " USDT";
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }
  }
}
</style>
