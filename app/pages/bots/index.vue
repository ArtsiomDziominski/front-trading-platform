<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
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
const isDesktop = useMediaQuery('(min-width: 641px)', { ssrWidth: 1024 })
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
let disposed = false
// Bots are fetched on the client only: until then an empty list does not mean "no bots"
const listLoaded = ref(false)

const filter = ref<BotFilterKey>('all')
const favoritesOnly = ref(false)
const attentionOnly = ref(false)
const helpOpen = ref(false)
const createOpen = ref(false)
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const pendingBulkAction = ref<BulkActionKey | null>(null)

const filterOptions: { key: BotFilterKey, labelKey: string }[] = [
  { key: 'all', labelKey: 'bots.filter_all' },
  { key: 'active', labelKey: 'bots.filter_active' },
  { key: 'stopped', labelKey: 'bots.filter_stopped' },
  { key: 'closed', labelKey: 'bots.filter_closed' },
]

const filterSelectItems = computed(() =>
  filterOptions.map(option => ({
    label: t(option.labelKey),
    value: option.key,
  })),
)

const isBulkBusy = computed(() => Boolean(bulkActionLoading.value))

// All bots are loaded once; the tabs filter on the client so the summary always counts every bot
const visibleBots = computed(() => {
  const statuses = filter.value === 'all' ? null : FILTER_STATUSES[filter.value]
  return bots.value.filter((bot) => {
    if (statuses && !statuses.includes(bot.lifecycle_status)) return false
    if (favoritesOnly.value && !bot.favorite) return false
    if (attentionOnly.value && bot.engine_state !== 'ERROR') return false
    return true
  })
})

// "Needs attention" counts every bot, so it replaces the other filters instead of combining with them
watch(attentionOnly, (on) => {
  if (!on) return
  filter.value = 'all'
  favoritesOnly.value = false
})
watch([filter, favoritesOnly], ([nextFilter, nextFavorites]) => {
  if (nextFilter !== 'all' || nextFavorites) attentionOnly.value = false
})

const emptyFilterText = computed(() => {
  if (attentionOnly.value) return t('bots.no_attention_bots')
  if (favoritesOnly.value) return t('bots.no_favorite_bots')
  return t('bots.no_bots_filtered')
})

const pageActionItems = computed(() => [
  [
    {
      label: t('bots.event_history_open'),
      icon: 'i-lucide-history',
      to: '/history',
    },
    {
      label: t('bots.manage_api_keys'),
      icon: 'i-lucide-key-round',
      to: '/settings#api-keys',
    },
  ],
])

const bulkActionItems = computed(() => [
  [
    {
      label: t('bots.bulk_stop_all'),
      icon: 'i-lucide-pause',
      disabled: isBulkBusy.value || loading.value,
      onSelect: () => openBulkConfirm('stop-all'),
    },
    {
      label: t('bots.bulk_close_all'),
      icon: 'i-lucide-square',
      disabled: isBulkBusy.value || loading.value,
      onSelect: () => openBulkConfirm('close-all'),
    },
    {
      label: t('bots.bulk_remove_all'),
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      disabled: isBulkBusy.value || loading.value,
      onSelect: () => openBulkConfirm('remove-all'),
    },
  ],
])

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

useSeoMeta({
  title: () => t('bots.title'),
  description: () => t('bots.subtitle'),
})

function loadBots() {
  clearBulkActionFeedback()
  return fetchBots()
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

watch([filter, favoritesOnly, attentionOnly], () => {
  clearBulkActionFeedback()
})

onMounted(async () => {
  await loadBots()
  listLoaded.value = true
  // Left before the list arrived: subscribing now would leave the socket open with no one to close it
  if (disposed) return
  unsubscribeWs = subscribeBotsUpdates()
})

onUnmounted(() => {
  disposed = true
  unsubscribeWs?.()
})
</script>

<template>
  <main class="page-section">
    <div class="container">
      <div class="page-header">
        <div class="page-header__heading">
          <h1 class="section-title">{{ $t('bots.subtitle') }}</h1>
        </div>
        <div class="page-header__actions">
          <AppButton size="sm" @click="createOpen = true">
            + {{ $t('bots.create_bot') }}
          </AppButton>
          <UDropdownMenu :items="pageActionItems" :content="{ align: 'end' }">
            <AppButton
              variant="secondary"
              size="sm"
              icon="i-lucide-ellipsis"
              square
              :aria-label="$t('bots.page_actions')"
            />
          </UDropdownMenu>
          <UTooltip :text="$t('bots.help_open')" :delay-duration="200">
            <AppButton
              variant="secondary"
              size="sm"
              icon="i-lucide-circle-help"
              square
              :aria-label="$t('bots.help_open')"
              @click="helpOpen = true"
            />
          </UTooltip>
        </div>
      </div>

      <BotsSummary
        v-if="bots.length"
        v-model:attention-only="attentionOnly"
        :bots="bots"
      />

      <div class="bots-toolbar">
        <div class="bots-toolbar__filters">
          <UFieldGroup
            v-if="isDesktop"
            class="bots-toolbar__tabs"
            size="sm"
            role="tablist"
            :aria-label="$t('bots.filter_label')"
          >
            <AppButton
              v-for="option in filterOptions"
              :key="option.key"
              role="tab"
              :aria-selected="filter === option.key"
              :label="$t(option.labelKey)"
              :variant="filter === option.key ? 'primary' : 'secondary'"
              @click="filter = option.key"
            />
          </UFieldGroup>

          <USelect
            v-else
            v-model="filter"
            class="bots-toolbar__select"
            size="sm"
            icon="i-lucide-filter"
            :items="filterSelectItems"
            :content="{ align: 'start' }"
            :ui="{ content: 'min-w-48', item: 'text-sm py-2' }"
            :aria-label="$t('bots.filter_label')"
          />

          <AppButton
            size="sm"
            icon="i-lucide-star"
            :square="!isDesktop"
            :variant="favoritesOnly ? 'primary' : 'secondary'"
            :aria-pressed="favoritesOnly"
            :aria-label="$t('bots.filter_favorites')"
            :title="isDesktop ? undefined : $t('bots.filter_favorites')"
            :label="isDesktop ? $t('bots.filter_favorites') : undefined"
            @click="favoritesOnly = !favoritesOnly"
          />
        </div>

        <div class="bots-toolbar__bulk">
          <UDropdownMenu
            :items="bulkActionItems"
            :content="{ align: 'end' }"
            :aria-label="$t('bots.bulk_actions_label')"
          >
            <AppButton
              variant="secondary"
              size="sm"
              icon="i-lucide-list-checks"
              trailing-icon="i-lucide-chevron-down"
              :disabled="isBulkBusy || loading"
              :loading="isBulkBusy"
            >
              {{ $t('bots.bulk_actions_label') }}
            </AppButton>
          </UDropdownMenu>
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

      <p v-if="(loading || !listLoaded) && !bots.length && !error" class="state-message" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="state-message state-message--error" role="alert">
        <p>{{ error }}</p>
        <AppButton variant="secondary" size="sm" @click="() => void loadBots()">
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <div v-else-if="visibleBots.length" class="bots-grid">
        <BotCard
          v-for="(bot, index) in visibleBots"
          :key="bot.id"
          :bot="bot"
          :index="index"
        />
      </div>

      <p v-else-if="bots.length" class="filter-empty" role="status">
        {{ emptyFilterText }}
      </p>

      <UCard v-else class="empty-state text-center">
        <div class="empty-state__icon" aria-hidden="true">
          <UIcon name="i-lucide-bot-off" class="empty-state__glyph" />
        </div>
        <p class="empty-state__text">{{ $t('bots.no_bots') }}</p>
        <div class="empty-state__actions">
          <AppButton @click="createOpen = true">
            {{ $t('bots.create_first') }}
          </AppButton>
          <AppButton variant="secondary" to="/settings#api-keys">
            {{ $t('bots.add_api_keys') }}
          </AppButton>
        </div>
      </UCard>
    </div>

    <BotsHelpModal v-model="helpOpen" />
    <BotCreateModal v-model:open="createOpen" />

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

.page-header__heading {
  min-width: 0;
  flex: 1;
}

.page-header__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.bots-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.bots-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.bots-toolbar__tabs {
  display: flex;
  width: max-content;
  max-width: 100%;
}

.bots-toolbar__select {
  flex: 1;
  min-width: 0;
}

.bots-toolbar__select :deep(button) {
  color: #fff !important;
  background: rgb(255 255 255 / 6%) !important;
  --tw-ring-color: rgb(255 255 255 / 18%) !important;
}

.bots-toolbar__bulk {
  flex-shrink: 0;
}

.bulk-feedback__list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.bots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 16px;
}

.filter-empty {
  margin: 0;
  padding: 32px;
  border: 1px dashed rgb(255 255 255 / 18%);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-align: center;
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

.empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 999px;
  border: 1px solid rgb(139 92 246 / 25%);
  background: rgb(139 92 246 / 12%);
  color: var(--color-accent);
}

.empty-state__glyph {
  width: 32px;
  height: 32px;
}

.empty-state__text {
  margin: 0 0 20px;
  color: var(--color-on-surface-muted);
  line-height: 1.5;
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
    margin-bottom: 20px;
  }

  .page-header__actions {
    width: 100%;
  }

  .page-header__actions > :first-child {
    flex: 1;
  }

  .bots-toolbar {
    margin-bottom: 22px;
  }

  .bots-toolbar {
    gap: 8px;
  }

  .bots-toolbar__filters {
    gap: 8px;
  }

  .bots-toolbar__filters :deep(.app-button) {
    flex: none;
  }

  .bots-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
