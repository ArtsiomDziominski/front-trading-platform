<script setup lang="ts">
import { StopLossMode, type BotListItem } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'
import {
  buildStopLossPayload,
  isStopLossApiError,
  parseStopLoss,
  validateStopLoss,
} from '~/utils/stopLoss'

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

const mode = ref<StopLossMode>(StopLossMode.Off)
const value = ref('')
const fieldError = ref('')

const saving = computed(() => isBotActionLoading(props.bot.id, 'update-config'))
const actionError = computed(() => getBotActionError(props.bot.id))

function hydrateFromBot() {
  const parsed = parseStopLoss(props.bot.config)
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

  const validationError = validateStopLoss(mode.value, value.value, t)
  if (validationError) {
    fieldError.value = validationError
    return
  }

  const stopLoss = buildStopLossPayload(mode.value, value.value)

  try {
    await updateBotConfig(props.bot.id, {
      ...props.bot.config,
      stop_loss_percent: stopLoss.stop_loss_percent,
    })
    open.value = false
  } catch (error) {
    if (isStopLossApiError(error)) {
      fieldError.value = parseApiError(error, t('bots.error_stop_loss_percent_max'))
      clearBotActionError(props.bot.id)
    }
  }
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="$t('bots.stop_loss_edit')"
    :description="$t('bots.stop_loss_edit_desc')"
    scrollable
    :dismissible="!saving"
    :close="!saving"
    :ui="{ footer: 'flex-col-reverse gap-2 sm:flex-row sm:justify-end' }"
  >
    <template #body>
      <div class="stop-loss-edit">
        <BotStopLossFields
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
        {{ $t('bots.stop_loss_save') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.stop-loss-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
