<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import type { BotConfirmCopy } from '~/composables/useBotActions'

/** Confirmation and edit dialogs for one bot; state comes from `useBotActions`. */
defineProps<{
  bot: BotListItem
  confirmCopy: BotConfirmCopy
  confirmLoading: boolean
  canEditGridConfig: boolean
  canEditMixedGrid: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmOpen = defineModel<boolean>('confirmOpen', { required: true })
const takeProfitOpen = defineModel<boolean>('takeProfitOpen', { required: true })
const stopLossOpen = defineModel<boolean>('stopLossOpen', { required: true })
const mixedGridOpen = defineModel<boolean>('mixedGridOpen', { required: true })
</script>

<template>
  <ConfirmModal
    v-model="confirmOpen"
    :title="confirmCopy.title"
    :message="confirmCopy.message"
    :confirm-label="confirmCopy.confirmLabel"
    :cancel-label="$t('common.cancel')"
    :loading-label="$t('common.loading')"
    :loading="confirmLoading"
    :confirm-variant="confirmCopy.variant"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />

  <BotTakeProfitEditModal
    v-if="canEditGridConfig"
    v-model:open="takeProfitOpen"
    :bot="bot"
  />

  <BotStopLossEditModal
    v-if="canEditGridConfig"
    v-model:open="stopLossOpen"
    :bot="bot"
  />

  <BotMixedGridEditModal
    v-if="canEditMixedGrid"
    v-model:open="mixedGridOpen"
    :bot="bot"
  />
</template>
