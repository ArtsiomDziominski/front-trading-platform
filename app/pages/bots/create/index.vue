<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const { market, type, selectedEntry, openSelected } = useBotTypePicker()

usePageSeo({
  title: () => t('bots.create_title'),
  description: () => t('bots.create_modal_desc'),
  noindex: true,
})
</script>

<template>
  <main class="page-section">
    <div class="container picker-container">
      <div class="page-header">
        <div>
          <h1 class="section-title">{{ $t('bots.create_modal_title') }}</h1>
          <p class="page-header__desc">{{ $t('bots.create_modal_desc') }}</p>
        </div>
        <AppButton variant="secondary" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </AppButton>
      </div>

      <UCard class="create-form-card picker-card">
        <BotTypePicker v-model:market="market" v-model:type="type" />

        <div class="picker-actions">
          <AppButton :disabled="!selectedEntry" @click="openSelected">
            {{ $t('bots.create_continue') }}
          </AppButton>
        </div>
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.picker-container {
  max-width: 720px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
}

.page-header__desc {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.picker-card {
  padding: 32px;
}

.picker-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
    margin-bottom: 24px;
  }

  .page-header > :last-child {
    width: 100%;
  }

  .picker-card {
    padding: 20px;
  }

  .picker-actions > * {
    width: 100%;
    justify-content: center;
    min-height: 44px;
  }
}
</style>
