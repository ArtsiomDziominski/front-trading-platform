<script setup lang="ts">
import type { BotLifecycleStatus } from '#shared/types/bot'

definePageMeta({
  middleware: 'bots-auth',
})

type BotFilterKey = 'all' | 'active' | 'stopped' | 'closed'
type BulkActionKey = 'stop-all' | 'close-all' | 'remove-all'

const FILTER_STATUSES: Record<Exclude<BotFilterKey, 'all'>, BotLifecycleStatus[]> = {
  active: ['ACTIVE'],
  stopped: ['STOPPED'],
  closed: ['CLOSED'],
}

const { t } = useI18n()
const {
  bots,
  loading,
  error,
  fetchBots,
  subscribeBotsUpdates,
  bulkActionLoading,
  bulkActionError,
  bulkActionFailures,
  stopAllBots,
  closeAllBots,
  removeAllBots,
  clearBulkActionFeedback,
} = useBots()

let unsubscribeWs: (() => void) | undefined

const filter = ref<BotFilterKey>('all')
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const pendingBulkAction = ref<BulkActionKey | null>(null)

const filterOptions: { key: BotFilterKey, labelKey: string }[] = [
  { key: 'all', labelKey: 'bots.filter_all' },
  { key: 'active', labelKey: 'bots.filter_active' },
  { key: 'stopped', labelKey: 'bots.filter_stopped' },
  { key: 'closed', labelKey: 'bots.filter_closed' },
]

const bulkActions: { key: BulkActionKey, labelKey: string, variant: 'secondary' | 'danger' }[] = [
  { key: 'stop-all', labelKey: 'bots.bulk_stop_all', variant: 'secondary' },
  { key: 'close-all', labelKey: 'bots.bulk_close_all', variant: 'secondary' },
  { key: 'remove-all', labelKey: 'bots.bulk_remove_all', variant: 'danger' },
]

const confirmCopy = computed(() => {
  switch (pendingBulkAction.value) {
    case 'stop-all':
      return {
        title: t('bots.bulk_confirm_stop_all_title'),
        message: t('bots.bulk_confirm_stop_all_message'),
        confirmLabel: t('bots.bulk_stop_all'),
        variant: 'primary' as const,
      }
    case 'close-all':
      return {
        title: t('bots.bulk_confirm_close_all_title'),
        message: t('bots.bulk_confirm_close_all_message'),
        confirmLabel: t('bots.bulk_close_all'),
        variant: 'primary' as const,
      }
    case 'remove-all':
      return {
        title: t('bots.bulk_confirm_remove_all_title'),
        message: t('bots.bulk_confirm_remove_all_message'),
        confirmLabel: t('bots.bulk_remove_all'),
        variant: 'danger' as const,
      }
    default:
      return {
        title: '',
        message: '',
        confirmLabel: t('common.confirm'),
        variant: 'primary' as const,
      }
  }
})

const isBulkBusy = computed(() => Boolean(bulkActionLoading.value))

useSeoMeta({
  title: () => t('bots.title'),
  description: () => t('bots.subtitle'),
})

function loadBots() {
  clearBulkActionFeedback()
  const statuses = filter.value === 'all' ? undefined : FILTER_STATUSES[filter.value]
  return fetchBots(statuses)
}

function openBulkConfirm(action: BulkActionKey) {
  if (isBulkBusy.value) return
  pendingBulkAction.value = action
  confirmOpen.value = true
}

function closeBulkConfirm() {
  if (confirmLoading.value) return
  confirmOpen.value = false
  pendingBulkAction.value = null
}

async function confirmBulkAction() {
  if (!pendingBulkAction.value) return

  confirmLoading.value = true
  try {
    if (pendingBulkAction.value === 'stop-all') {
      await stopAllBots()
    } else if (pendingBulkAction.value === 'close-all') {
      await closeAllBots()
    } else if (pendingBulkAction.value === 'remove-all') {
      await removeAllBots()
    }
    confirmOpen.value = false
    pendingBulkAction.value = null
  } catch {
    // error shown via bulkActionError
  } finally {
    confirmLoading.value = false
  }
}

watch(filter, () => {
  loadBots()
})

onMounted(async () => {
  await loadBots()
  unsubscribeWs = subscribeBotsUpdates()
})

onUnmounted(() => {
  unsubscribeWs?.()
})
</script>

<template>
  <main class="page-section">
    <div class="container">
      <div class="page-header">
        <div>
          <span class="section-label">{{ $t('bots.title') }}</span>
          <h1 class="section-title">{{ $t('bots.subtitle') }}</h1>
        </div>
        <div class="page-header__actions">
          <UButton color="neutral" variant="outline" to="/bots/history">
            {{ $t('bots.event_history_open') }}
          </UButton>
          <UButton color="neutral" variant="outline" to="/settings#api-keys">
            {{ $t('bots.manage_api_keys') }}
          </UButton>
          <UButton to="/bots/create">
            + {{ $t('bots.create_bot') }}
          </UButton>
        </div>
      </div>

      <div class="bots-toolbar">
        <UFieldGroup size="sm" role="tablist" :aria-label="$t('bots.filter_label')">
          <UButton
            v-for="option in filterOptions"
            :key="option.key"
            role="tab"
            :aria-selected="filter === option.key"
            :label="$t(option.labelKey)"
            :color="filter === option.key ? 'primary' : 'neutral'"
            :variant="filter === option.key ? 'solid' : 'outline'"
            @click="filter = option.key"
          />
        </UFieldGroup>

        <div class="bots-bulk" :aria-label="$t('bots.bulk_actions_label')">
          <UButton
            v-for="action in bulkActions"
            :key="action.key"
            size="sm"
            :color="action.variant === 'danger' ? 'error' : 'neutral'"
            :variant="action.variant === 'danger' ? 'solid' : 'outline'"
            :disabled="isBulkBusy || loading"
            :loading="bulkActionLoading === action.key"
            @click="openBulkConfirm(action.key)"
          >
            {{ $t(action.labelKey) }}
          </UButton>
        </div>
      </div>

      <UAlert
        v-if="bulkActionError"
        color="error"
        variant="subtle"
        :title="bulkActionError"
        class="mb-5"
      />

      <UAlert
        v-else-if="bulkActionFailures"
        color="warning"
        variant="subtle"
        class="mb-5"
        role="status"
      >
        <template #title>
          {{ $t('bots.bulk_partial_fail', { count: bulkActionFailures.items.length }) }}
        </template>
        <template #description>
          <ul class="bulk-feedback__list">
            <li v-for="item in bulkActionFailures.items" :key="item.bot_id">
              #{{ item.bot_id }}: {{ item.detail }}
            </li>
          </ul>
        </template>
      </UAlert>

      <p v-if="loading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <UButton color="neutral" variant="outline" size="sm" @click="() => void loadBots()">
          {{ $t('common.retry') }}
        </UButton>
      </div>

      <div v-else-if="bots.length" class="bots-grid">
        <BotCard
          v-for="(bot, index) in bots"
          :key="bot.id"
          :bot="bot"
          :index="index"
        />
      </div>

      <UCard v-else class="empty-state text-center">
        <p class="text-muted mb-4">{{ $t('bots.no_bots') }}</p>
        <UButton to="/bots/create">
          {{ $t('bots.create_first') }}
        </UButton>
      </UCard>
    </div>

    <ConfirmModal
      v-model="confirmOpen"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.confirmLabel"
      :cancel-label="$t('common.cancel')"
      :loading-label="$t('common.loading')"
      :loading="confirmLoading"
      :confirm-variant="confirmCopy.variant"
      @confirm="confirmBulkAction"
      @cancel="closeBulkConfirm"
    />
  </main>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.page-header__actions :deep(a.ring-inset),
.page-header__actions :deep(button.ring-inset),
.page-header__actions :deep(a.text-default.bg-default),
.page-header__actions :deep(button.text-default.bg-default) {
  color: var(--color-text) !important;
  background-color: var(--color-surface-muted) !important;
  --tw-ring-color: var(--color-border) !important;
}

.bots-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.bots-bulk {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bulk-feedback__list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.bots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.state-message--error {
  color: var(--color-danger);
}

.empty-state {
  padding: 64px 24px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .bots-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .bots-bulk {
    justify-content: stretch;
  }
}
</style>
