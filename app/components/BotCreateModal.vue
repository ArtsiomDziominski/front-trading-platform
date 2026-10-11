<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const { market, type, selectedEntry, reset, openSelected } = useBotTypePicker()

watch(open, (isOpen) => {
  if (isOpen) reset()
})

async function handleContinue() {
  if (!selectedEntry.value) return
  open.value = false
  await openSelected()
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="$t('bots.create_modal_title')"
    :description="$t('bots.create_modal_desc')"
    scrollable
    :ui="{ content: 'md:max-w-2xl', footer: 'flex-col-reverse gap-2 sm:flex-row sm:justify-end' }"
  >
    <template #body>
      <BotTypePicker v-model:market="market" v-model:type="type" />
    </template>

    <template #footer>
      <AppButton variant="secondary" size="sm" @click="open = false">
        {{ $t('common.cancel') }}
      </AppButton>
      <AppButton size="sm" :disabled="!selectedEntry" @click="handleContinue">
        {{ $t('bots.create_continue') }}
      </AppButton>
    </template>
  </AppModal>
</template>
