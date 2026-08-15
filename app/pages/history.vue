<script setup lang="ts">
import type { ExchangeType } from '#shared/types/api-key'
import { exchangeDisplayName } from '#shared/utils/exchange-images'
import {
  buildHistoryFilters,
  hasBotHistoryFilters,
  parseBotIdQuery,
  parseExchangeQuery,
} from '~/utils/botHistory'

definePageMeta({
  middleware: 'auth',
})

const HISTORY_EXCHANGES: ExchangeType[] = ['BINANCE', 'OKX', 'BYBIT', 'OTHER']

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { fetchBots, bots } = useBots()
const {
  events,
  loading,
  loadingMore,
  clearing,
  error,
  hasMore,
  deletedCount,
  load,
  loadMore,
  clear,
} = useBotEventHistory()

useSeoMeta({
  title: () => t('bots.event_history_title'),
  description: () => t('bots.event_history_subtitle'),
})

function queryString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

const selectedBotId = ref<number | 'all'>(parseBotIdQuery(route.query.bot_id) ?? 'all')
const selectedExchange = ref<ExchangeType | 'all'>(parseExchangeQuery(route.query.exchange) ?? 'all')
const dateFrom = ref(queryString(route.query.from))
const dateTo = ref(queryString(route.query.to))
const confirmOpen = ref(false)

const botFilterModel = computed({
  get: (): number | 'all' | undefined => selectedBotId.value,
  set: (value: number | 'all' | undefined) => {
    selectedBotId.value = value ?? 'all'
  },
})

const exchangeFilterModel = computed({
  get: (): ExchangeType | 'all' | undefined => selectedExchange.value,
  set: (value: ExchangeType | 'all' | undefined) => {
    selectedExchange.value = value ?? 'all'
  },
})

const botFilterItems = computed(() => {
  const items: Array<{ label: string, value: number | 'all' }> = [
    { label: t('bots.event_history_filter_all'), value: 'all' },
    ...bots.value.map((bot) => ({
      label: `#${bot.id} · ${bot.symbol}`,
      value: bot.id,
    })),
  ]

  if (selectedBotId.value !== 'all' && !bots.value.some((bot) => bot.id === selectedBotId.value)) {
    items.push({
      label: `#${selectedBotId.value}`,
      value: selectedBotId.value,
    })
  }

  return items
})

function exchangeLabel(exchange: ExchangeType): string {
  if (exchange === 'OTHER') return t('bots.event_history_exchange_other')
  return exchangeDisplayName(exchange)
}

const exchangeFilterItems = computed(() => [
  { label: t('bots.event_history_filter_all_exchanges'), value: 'all' as const },
  ...HISTORY_EXCHANGES.map((exchange) => ({
    label: exchangeLabel(exchange),
    value: exchange,
  })),
])

const currentFilters = computed(() =>
  buildHistoryFilters({
    botId: selectedBotId.value === 'all' ? undefined : selectedBotId.value,
    exchange: selectedExchange.value === 'all' ? undefined : selectedExchange.value,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  }),
)

const hasFilters = computed(() => hasBotHistoryFilters(currentFilters.value))

const confirmCopy = computed(() => ({
  title: t('bots.event_history_clear_title'),
  message: hasFilters.value
    ? t('bots.event_history_clear_confirm_filtered')
    : t('bots.event_history_clear_confirm_all'),
}))

function syncQuery() {
  const query: Record<string, string> = {}
  if (selectedBotId.value !== 'all') query.bot_id = String(selectedBotId.value)
  if (selectedExchange.value !== 'all') query.exchange = selectedExchange.value
  if (dateFrom.value) query.from = dateFrom.value
  if (dateTo.value) query.to = dateTo.value

  router.replace({ query })
}

watch(currentFilters, (filters) => {
  deletedCount.value = null
  syncQuery()
  load(filters)
})

onMounted(() => {
  fetchBots()
  load(currentFilters.value)
})

async function confirmClear() {
  try {
    await clear(currentFilters.value)
    confirmOpen.value = false
  } catch {
    confirmOpen.value = false
  }
}
</script>

<template>
  <main class="page-section">
    <div class="container history-container">
      <div class="page-header">
        <div>
          <h1 class="section-title">{{ $t('bots.event_history_title') }}</h1>
          <p class="page-header__message">{{ $t('bots.event_history_subtitle') }}</p>
        </div>
        <AppButton
          variant="secondary"
          :disabled="clearing || loading"
          @click="confirmOpen = true"
        >
          {{ $t('bots.event_history_clear') }}
        </AppButton>
      </div>

      <div class="history-toolbar">
        <UFormField
          :label="$t('bots.event_history_filter_from')"
          class="history-filter"
        >
          <UInput
            v-model="dateFrom"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('bots.event_history_filter_to')"
          class="history-filter"
        >
          <UInput
            v-model="dateTo"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('bots.event_history_filter_exchange')"
          class="history-filter"
        >
          <USelect
            v-model="exchangeFilterModel"
            :items="exchangeFilterItems"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('bots.event_history_filter_bot')"
          class="history-filter"
        >
          <USelect
            v-model="botFilterModel"
            :items="botFilterItems"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>
      </div>

      <p
        v-if="deletedCount != null"
        class="history-cleared"
        role="status"
      >
        {{ $t('bots.event_history_cleared', { count: deletedCount }) }}
      </p>

      <p
        v-if="loading && !events.length"
        class="state-message"
        role="status"
      >
        {{ $t('common.loading') }}
      </p>

      <div
        v-else-if="error && !events.length"
        class="state-message state-message--error"
        role="alert"
      >
        <p>{{ error }}</p>
        <AppButton
          variant="secondary"
          size="sm"
          @click="load(currentFilters)"
        >
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <template v-else-if="events.length">
        <BotEventFeed :events="events" />
        <div
          v-if="hasMore"
          class="history-more"
        >
          <AppButton
            variant="secondary"
            :loading="loadingMore"
            @click="loadMore()"
          >
            {{ $t('bots.event_history_load_more') }}
          </AppButton>
        </div>
      </template>

      <UCard
        v-else
        class="empty-state text-center"
      >
        <p class="text-muted">{{ $t('bots.event_history_empty') }}</p>
      </UCard>
    </div>

    <ConfirmModal
      v-model="confirmOpen"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="$t('bots.event_history_clear')"
      :cancel-label="$t('common.cancel')"
      :loading-label="$t('common.loading')"
      :loading="clearing"
      confirm-variant="danger"
      @confirm="confirmClear"
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

.page-header__message {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.history-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
  margin-bottom: 24px;
}

.history-cleared {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.history-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
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
  padding: 48px 24px;
}

@media (max-width: 900px) {
  .history-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
  }

  .page-header > :last-child {
    width: 100%;
  }

  .history-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
