<script setup lang="ts">
import type { BotListItem, GridCycleState, GridDirection } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'
import {
  buildMixedGridPayload,
  defaultMixedGridForm,
  isMixedCycleInProgress,
  parseMixedGrid,
  validateMixedGrid,
  type MixedGridForm,
} from '~/utils/mixedGrid'

const props = defineProps<{
  bot: BotListItem
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const {
  updateBotConfig,
  isBotActionLoading,
  getBotActionError,
  clearBotActionError,
} = useBots()

const form = ref<MixedGridForm>(defaultMixedGridForm())
const fieldError = ref('')

const saving = computed(() => isBotActionLoading(props.bot.id, 'update-config'))
const actionError = computed(() => getBotActionError(props.bot.id))
const cycleInProgress = computed(() => isMixedCycleInProgress(props.bot))
const direction = computed(() => (props.bot.config.direction === 'SHORT' ? 'SHORT' : 'LONG') as GridDirection)
const gridStep = computed(() => String(props.bot.config.grid_step_percent ?? ''))
const startPrice = computed(() => (props.bot.config.start_price == null ? '' : String(props.bot.config.start_price)))

function hydrateFromBot() {
  form.value = parseMixedGrid(props.bot.config.mixed_grid) ?? defaultMixedGridForm()
  fieldError.value = ''
  clearBotActionError(props.bot.id)
}

watch(open, (isOpen) => {
  if (isOpen) hydrateFromBot()
})

async function handleSave() {
  fieldError.value = ''
  clearBotActionError(props.bot.id)

  const validationError = validateMixedGrid(form.value, t)
  if (validationError) {
    fieldError.value = validationError
    return
  }

  try {
    await updateBotConfig(props.bot.id, {
      ...props.bot.config,
      initial_amount: null,
      initial_amount_usdt: null,
      initial_amount_percent: null,
      sizing_mode: 'mixed',
      grid_orders_count: Math.max(form.value.orders.length - 1, 1),
      mixed_grid: buildMixedGridPayload(form.value),
    })
    open.value = false
  } catch (error) {
    // The exchange check names the orders below its minimum — show it next to the table
    fieldError.value = parseApiError(error, t('bots.mixed_error_api'))
    clearBotActionError(props.bot.id)
  }
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="$t('bots.mixed_edit')"
    :description="$t('bots.mixed_edit_desc')"
    scrollable
    :dismissible="!saving"
    :close="!saving"
    :ui="{ content: 'sm:max-w-3xl', footer: 'flex-col-reverse gap-2 sm:flex-row sm:justify-end' }"
  >
    <template #body>
      <div class="mixed-grid-edit">
        <UAlert
          v-if="cycleInProgress"
          color="info"
          variant="subtle"
          :title="$t('bots.mixed_edit_next_cycle')"
        />

        <BotMixedGridFields
          v-model:form="form"
          :direction="direction"
          :grid-step="gridStep"
          :start-price="startPrice"
          :error="fieldError"
          :cycle-state="(bot.cycle_state as GridCycleState | null | undefined) ?? null"
          :cycle-in-progress="cycleInProgress"
        />

        <UAlert
          v-if="actionError"
          color="error"
          variant="subtle"
          :title="actionError"
        />
      </div>
    </template>

    <template #footer>
      <AppButton
        variant="secondary"
        size="sm"
        :disabled="saving"
        @click="open = false"
      >
        {{ $t('common.cancel') }}
      </AppButton>
      <AppButton
        size="sm"
        :loading="saving"
        @click="handleSave"
      >
        {{ $t('bots.mixed_edit_save') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.mixed-grid-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
