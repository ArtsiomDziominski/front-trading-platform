<script setup lang="ts">
defineProps<{
  title: string
  /** Market name shown above the title, e.g. "Futures". */
  marketLabel: string
  loading: boolean
  hasApiKeys: boolean
}>()

const slots = useSlots()
const hasSidebar = computed(() => Boolean(slots.sidebar))
</script>

<template>
  <main class="page-section">
    <div class="container create-container">
      <div class="page-header">
        <div>
          <p class="page-header__eyebrow">{{ marketLabel }}</p>
          <h1 class="section-title">{{ title }}</h1>
        </div>
        <AppButton variant="secondary" to="/bots">
          {{ $t('bots.back_to_bots') }}
        </AppButton>
      </div>

      <p v-if="loading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <UCard v-else-if="!hasApiKeys" class="empty-keys-card text-center">
        <p class="empty-keys-card__desc mb-4">{{ $t('bots.no_api_keys') }}</p>
        <AppButton to="/settings#api-keys">
          {{ $t('bots.manage_api_keys') }}
        </AppButton>
      </UCard>

      <div v-else class="create-layout" :class="{ 'create-layout--single': !hasSidebar }">
        <div class="create-main">
          <slot />
        </div>

        <div v-if="hasSidebar" class="create-sidebar">
          <slot name="sidebar" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.create-container {
  max-width: 1080px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
}

.page-header__eyebrow {
  margin: 0 0 6px;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: start;
}

.create-layout--single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 720px;
}

.create-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.create-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-keys-card {
  padding: 32px;
}

.empty-keys-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.state-message {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

@media (max-width: 900px) {
  .create-layout {
    grid-template-columns: 1fr;
  }
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
}
</style>
