<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import { pnlTone, summarizeBots } from '~/utils/botView'
import { formatUsdt } from '~/utils/formatNumber'

/** Totals above the bot list; the «needs attention» tile filters the list to bots in error. */
const props = defineProps<{
  bots: BotListItem[]
}>()

const attentionOnly = defineModel<boolean>('attentionOnly', { default: false })

const { locale } = useI18n()

const summary = computed(() => summarizeBots(props.bots))
const pnlLabel = computed(() =>
  summary.value.unrealizedPnl == null ? '—' : formatUsdt(summary.value.unrealizedPnl, locale.value, true),
)
const attentionDisabled = computed(() => summary.value.attention === 0 && !attentionOnly.value)
</script>

<template>
  <section class="bots-summary" :aria-label="$t('bots.summary_label')">
    <div class="bots-summary__stat">
      <span class="bots-summary__key">{{ $t('bots.summary_pnl') }}</span>
      <span class="bots-summary__value" :class="`bots-summary__value--${pnlTone(summary.unrealizedPnl)}`">
        {{ pnlLabel }}
      </span>
    </div>
    <div class="bots-summary__stat">
      <span class="bots-summary__key">{{ $t('bots.summary_running') }}</span>
      <span class="bots-summary__value">
        {{ $t('bots.summary_running_value', { running: summary.running, total: summary.total }) }}
      </span>
    </div>
    <div class="bots-summary__stat">
      <span class="bots-summary__key">{{ $t('bots.summary_in_position') }}</span>
      <span class="bots-summary__value">{{ summary.inPosition }}</span>
    </div>
    <button
      type="button"
      class="bots-summary__stat bots-summary__stat--attention"
      :class="{ 'bots-summary__stat--alert': summary.attention > 0 }"
      :aria-pressed="attentionOnly"
      :disabled="attentionDisabled"
      :title="$t('bots.summary_attention_hint')"
      @click="attentionOnly = !attentionOnly"
    >
      <span class="bots-summary__key">
        {{ $t('bots.summary_attention') }}
        <UIcon v-if="attentionOnly" name="i-lucide-filter-x" class="bots-summary__key-icon" aria-hidden="true" />
      </span>
      <span class="bots-summary__value">{{ summary.attention }}</span>
    </button>
  </section>
</template>

<style scoped>
.bots-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.bots-summary__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 14px;
  background: #0d0d12;
  color: inherit;
  font: inherit;
  text-align: left;
}

.bots-summary__key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.bots-summary__key-icon {
  width: 13px;
  height: 13px;
}

.bots-summary__value {
  overflow: hidden;
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bots-summary__value--up {
  color: var(--color-up);
}

.bots-summary__value--down {
  color: var(--color-down);
}

.bots-summary__stat--attention {
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.bots-summary__stat--attention:hover:not(:disabled) {
  border-color: rgb(255 255 255 / 18%);
  background: #12121a;
}

.bots-summary__stat--attention:disabled {
  cursor: default;
}

.bots-summary__stat--alert .bots-summary__value {
  color: var(--color-down);
}

.bots-summary__stat--attention[aria-pressed="true"] {
  border-color: var(--color-down-dim);
}

.bots-summary__stat--attention:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (max-width: 960px) {
  .bots-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
