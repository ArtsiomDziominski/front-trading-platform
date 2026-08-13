<script setup lang="ts">
import { TakeProfitMode, type BotListItem } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'
import {
  buildTakeProfitPayload,
  isTakeProfitApiError,
  parseTakeProfit,
  validateTakeProfit,
} from '~/utils/takeProfit'

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

const mode = ref<TakeProfitMode>(TakeProfitMode.Off)
const value = ref('')
const fieldError = ref('')

const saving = computed(() => isBotActionLoading(props.bot.id, 'update-config'))
const actionError = computed(() => getBotActionError(props.bot.id))

function hydrateFromBot() {
  const parsed = parseTakeProfit(props.bot.config)
  mode.value = parsed.mode
  value.value = parsed.value
  fieldError.value = ''
  clearBotActionError(props.bot.id)
}

watch(open, (isOpen) => {
  if (isOpen) hydrateFromBot()
})

async function handleSave() {
  fieldError.value = ''
  clearBotActionError(props.bot.id)

  const validationError = validateTakeProfit(mode.value, value.value, t)
  if (validationError) {
    fieldError.value = validationError
    return
  }

  const takeProfit = buildTakeProfitPayload(mode.value, value.value)

  try {
    await updateBotConfig(props.bot.id, {
      ...props.bot.config,
      take_profit_percent: takeProfit.take_profit_percent,
      take_profit_amount: takeProfit.take_profit_amount,
    })
    open.value = false
  } catch (error) {
    if (isTakeProfitApiError(error)) {
      fieldError.value = parseApiError(error, t('bots.error_take_profit_xor'))
      clearBotActionError(props.bot.id)
    }
  }
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="$t('bots.take_profit_edit')"
    :description="$t('bots.take_profit_edit_desc')"
    scrollable
    :dismissible="!saving"
    :close="!saving"
    :ui="{ footer: 'flex-col-reverse gap-2 sm:flex-row sm:justify-end' }"
  >
    <template #body>
      <div class="take-profit-edit">
        <BotTakeProfitFields
          v-model:mode="mode"
          v-model:value="value"
          :error="fieldError"
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
        {{ $t('bots.take_profit_save') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.take-profit-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
