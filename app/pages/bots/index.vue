<script setup lang="ts">
import type { BotLifecycleStatus } from '#shared/types/bot'

definePageMeta({
  middleware: 'auth',
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
        <NeumoButton variant="primary" tag="NuxtLink" to="/bots/create">
          + {{ $t('bots.create_bot') }}
        </NeumoButton>
      </div>

      <div class="bots-toolbar">
        <div class="bots-filters" role="tablist" :aria-label="$t('bots.filter_label')">
          <button
            v-for="option in filterOptions"
            :key="option.key"
            type="button"
            role="tab"
            class="bots-filters__btn"
            :class="{ 'bots-filters__btn--active': filter === option.key }"
            :aria-selected="filter === option.key"
            @click="filter = option.key"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>

        <div class="bots-bulk" :aria-label="$t('bots.bulk_actions_label')">
          <NeumoButton
            v-for="action in bulkActions"
            :key="action.key"
            :variant="action.variant"
            size="sm"
            :disabled="isBulkBusy || loading"
            @click="openBulkConfirm(action.key)"
          >
            {{
              bulkActionLoading === action.key
                ? $t('common.loading')
                : $t(action.labelKey)
            }}
          </NeumoButton>
        </div>
      </div>

      <div
        v-if="bulkActionError"
        class="bulk-feedback bulk-feedback--error"
        role="alert"
      >
        <p>{{ bulkActionError }}</p>
      </div>

      <div
        v-else-if="bulkActionFailures"
        class="bulk-feedback bulk-feedback--warn"
        role="status"
      >
        <p>{{ $t('bots.bulk_partial_fail', { count: bulkActionFailures.items.length }) }}</p>
        <ul class="bulk-feedback__list">
          <li v-for="item in bulkActionFailures.items" :key="item.bot_id">
            #{{ item.bot_id }}: {{ item.detail }}
          </li>
        </ul>
      </div>

      <p v-if="loading" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <NeumoButton variant="secondary" size="sm" @click="loadBots">
          {{ $t('common.retry') }}
        </NeumoButton>
      </div>

      <div v-else-if="bots.length" class="bots-grid">
        <BotCard v-for="bot in bots" :key="bot.id" :bot="bot" />
      </div>

      <div v-else class="empty-state neumo">
        <p>{{ $t('bots.no_bots') }}</p>
        <NeumoButton variant="primary" tag="NuxtLink" to="/bots/create">
          {{ $t('bots.create_first') }}
        </NeumoButton>
      </div>
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

.bots-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.bots-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bots-filters__btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, box-shadow 0.15s;
}

.bots-filters__btn:hover {
  color: var(--color-text);
}

.bots-filters__btn--active {
  color: var(--color-accent);
  box-shadow: var(--shadow-inset-sm);
}

.bots-bulk {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bulk-feedback {
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.bulk-feedback--error {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.bulk-feedback--warn {
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-inset-sm);
}

.bulk-feedback__list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.bots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
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
  display: grid;
  place-items: center;
  gap: 16px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-muted);
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

  .bots-bulk :deep(.neumo-btn) {
    flex: 1;
  }
}
</style>
