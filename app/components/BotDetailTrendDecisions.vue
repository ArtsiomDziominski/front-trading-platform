<script setup lang="ts">
import type { TrendDecision } from '#shared/types/bot'
import { formatDateTime, formatPrice } from '~/utils/formatNumber'
import { trendReasonText, trendStateLabel } from '~/utils/trend'

/** Decision journal (GET /bots/{id}/decisions): one row per closed candle — why the bot did or did not enter. */
const props = defineProps<{
  botId: number
  decisions: TrendDecision[]
  loaded: boolean
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  reload: []
}>()

const { t, locale } = useI18n()

/** «Holding the position» repeats every candle of a trade; hiding it leaves the decisions that changed something. */
const hideHold = ref(false)

const rows = computed(() => props.decisions
  .filter((decision) => !hideHold.value || decision.reason_code !== 'hold')
  .map((decision) => ({
    ...decision,
    time: decision.candle_close ?? decision.created_at,
    text: trendReasonText(t, locale.value, decision.reason_code, decision.reason_params, decision.reason),
  })))

function actionTone(action: string | null) {
  if (action === 'enter') return 'up'
  if (action === 'exit') return 'down'
  return 'muted'
}

function actionLabel(action: string | null) {
  if (action === 'enter' || action === 'exit' || action === 'hold' || action === 'wait') return t(`bots.trend_action_${action}`)
  return action ?? '—'
}
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`trend-decisions-${botId}`">
    <div class="detail-panel__head">
      <h2 :id="`trend-decisions-${botId}`" class="detail-panel__title">{{ $t('bots.trend_decisions_title') }}</h2>
      <div class="trend-decisions__tools">
        <UCheckbox v-model="hideHold" size="sm" :label="$t('bots.trend_decisions_hide_hold')" />
        <AppButton type="button" variant="secondary" size="sm" icon="i-lucide-refresh-cw" :loading="loading" @click="emit('reload')">
          {{ $t('bots.trend_decisions_reload') }}
        </AppButton>
      </div>
    </div>

    <p class="detail-panel__hint">{{ $t('bots.trend_decisions_hint') }}</p>

    <p v-if="error && decisions.length" class="trend-decisions__error" role="alert">{{ error }}</p>

    <div v-if="rows.length" class="detail-table-wrap">
      <table class="detail-table">
        <thead>
          <tr>
            <th scope="col">{{ $t('bots.trend_col_candle') }}</th>
            <th scope="col">{{ $t('bots.trend_col_state') }}</th>
            <th scope="col">{{ $t('bots.trend_col_action') }}</th>
            <th scope="col" class="num">{{ $t('bots.trend_col_close') }}</th>
            <th scope="col">{{ $t('bots.trend_col_reason') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td :data-label="$t('bots.trend_col_candle')">{{ formatDateTime(row.time, locale) }}</td>
            <td :data-label="$t('bots.trend_col_state')">{{ trendStateLabel(t, row.state) }}</td>
            <td :data-label="$t('bots.trend_col_action')">
              <span class="trend-decisions__action" :class="`trend-decisions__action--${actionTone(row.action)}`">{{ actionLabel(row.action) }}</span>
            </td>
            <td class="num" :data-label="$t('bots.trend_col_close')">{{ row.close == null ? '—' : formatPrice(row.close, locale) }}</td>
            <td class="trend-decisions__reason" :data-label="$t('bots.trend_col_reason')">{{ row.text }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="error" class="detail-panel__empty trend-decisions__error" role="alert">{{ error }}</p>
    <p v-else class="detail-panel__empty">
      {{ loaded ? (decisions.length ? $t('bots.trend_decisions_only_hold') : $t('bots.trend_decisions_empty')) : $t('common.loading') }}
    </p>
  </section>
</template>

<style scoped>
.trend-decisions__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.trend-decisions__action {
  display: inline-block;
  padding: 1px 8px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}

.trend-decisions__action--up {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.trend-decisions__action--down {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.trend-decisions__reason {
  min-width: 220px;
  line-height: 1.4;
}

.trend-decisions__error {
  margin: 0;
  color: var(--color-danger);
}
</style>
