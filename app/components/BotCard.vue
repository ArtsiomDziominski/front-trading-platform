<script setup lang="ts">
import { motion } from 'motion-v'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { BotListItem } from '#shared/types/bot'
import {
  BOT_TYPE_LABEL_KEYS,
  botDirection,
  botStatusView,
  isInPosition,
  pnlTone,
  supportedExchange,
} from '~/utils/botView'
import { formatUsdt } from '~/utils/formatNumber'

/** Compact bot tile for the `/bots` list; every action sits in the «⋯» menu, the tile opens the bot page. */
const props = withDefaults(defineProps<{
  bot: BotListItem
  index?: number
}>(), {
  index: 0,
})

const { t, locale } = useI18n()
const actions = useBotActions(() => props.bot)

const detailPath = computed(() => `/bots/${props.bot.id}`)
const staggerDelay = computed(() => Math.min(props.index * 0.05, 0.3))
const status = computed(() => botStatusView(props.bot))
const direction = computed(() => botDirection(props.bot))
const exchange = computed(() => supportedExchange(props.bot))
const typeLabel = computed(() => {
  const key = BOT_TYPE_LABEL_KEYS[props.bot.bot_type]
  return key ? t(key) : props.bot.bot_type
})
const isDimmed = computed(() => props.bot.lifecycle_status !== 'ACTIVE')
const hasError = computed(() => props.bot.engine_state === 'ERROR')

// Flat bots report PnL 0, which reads as a result; show a dash instead
const pnl = computed(() => (isInPosition(props.bot) ? props.bot.unrealized_pnl : null))
const pnlLabel = computed(() => (pnl.value == null ? '—' : formatUsdt(pnl.value, locale.value, true)))

type MenuItem = DropdownMenuItem & { value?: string }

const menuItems = computed<MenuItem[][]>(() => {
  const bot = props.bot
  const busy = actions.isBusy
  const groups: MenuItem[][] = [[
    { type: 'label', label: `${bot.symbol} · #${bot.id}` },
    { label: t('bots.menu_open'), icon: 'i-lucide-arrow-up-right', to: detailPath.value },
    { label: t('bots.event_history_open'), icon: 'i-lucide-history', to: `/history?bot_id=${bot.id}` },
  ]]

  if (actions.canEditGridConfig) {
    const edits: MenuItem[] = []
    if (actions.canEditMixedGrid) {
      edits.push({
        label: t('bots.mixed_edit'),
        icon: 'i-lucide-list-ordered',
        value: String(actions.mixedOrdersCount ?? ''),
        disabled: busy,
        onSelect: actions.openMixedGrid,
      })
    }
    edits.push(
      {
        label: t('bots.take_profit_edit'),
        icon: 'i-lucide-target',
        value: actions.takeProfitValue,
        disabled: busy,
        onSelect: actions.openTakeProfit,
      },
      {
        label: t('bots.stop_loss_edit'),
        icon: 'i-lucide-shield',
        value: actions.stopLossValue,
        disabled: busy,
        onSelect: actions.openStopLoss,
      },
    )
    groups.push(edits)
  }

  const controls: MenuItem[] = []
  if (actions.canStop) {
    controls.push({
      label: t('bots.action_stop'),
      icon: 'i-lucide-pause',
      disabled: busy,
      loading: actions.isLoading('stop'),
      onSelect: () => { void actions.stop() },
    })
  }
  if (actions.canRedeploy) {
    controls.push({
      label: t('bots.action_redeploy'),
      icon: 'i-lucide-refresh-cw',
      disabled: busy,
      onSelect: () => actions.openConfirm('redeploy'),
    })
  }
  if (actions.canClose) {
    controls.push({
      label: t('bots.action_close'),
      icon: 'i-lucide-square',
      disabled: busy,
      onSelect: () => actions.openConfirm('close'),
    })
  }
  if (controls.length) groups.push(controls)

  if (actions.canRemove) {
    groups.push([{
      label: t('bots.action_remove'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      disabled: busy,
      onSelect: () => actions.openConfirm('remove'),
    }])
  }

  return groups
})
</script>

<template>
  <motion.article
    class="bot-tile"
    :class="{ 'bot-tile--error': hasError, 'bot-tile--dim': isDimmed }"
    :initial="{ opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, delay: staggerDelay, ease: [0.22, 1, 0.36, 1] }"
  >
    <div class="bot-tile__head">
      <button
        type="button"
        class="bot-tile__star"
        :class="{ 'bot-tile__star--on': bot.favorite, 'bot-tile__star--pop': actions.favoritePop }"
        :aria-label="bot.favorite ? $t('bots.favorite_remove') : $t('bots.favorite_add')"
        :aria-pressed="bot.favorite"
        @click="actions.toggleFavorite"
      >
        <svg viewBox="0 0 24 24" :fill="bot.favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
      </button>

      <NuxtLink :to="detailPath" class="bot-tile__symbol" :aria-label="`${bot.symbol} #${bot.id}`">{{ bot.symbol }}</NuxtLink>
      <BotExchangeBadge v-if="exchange" :exchange="exchange" />

      <span class="bot-tile__spacer" />

      <span class="bot-tile__direction" :class="`bot-tile__direction--${direction.toLowerCase()}`">
        {{ direction }}
      </span>

      <UDropdownMenu :items="menuItems" :content="{ align: 'end' }" :modal="false">
        <button
          type="button"
          class="bot-tile__menu"
          :aria-label="$t('bots.menu_label', { symbol: bot.symbol, id: bot.id })"
        >
          <UIcon v-if="actions.isBusy" name="i-lucide-loader-circle" class="bot-tile__menu-icon animate-spin" />
          <UIcon v-else name="i-lucide-ellipsis" class="bot-tile__menu-icon" />
        </button>

        <template #item-trailing="{ item }">
          <span v-if="item.value" class="bot-tile__menu-value">{{ item.value }}</span>
        </template>
      </UDropdownMenu>
    </div>

    <dl class="bot-tile__rows">
      <div class="bot-tile__row">
        <dt>{{ $t('bots.type') }}</dt>
        <dd>{{ typeLabel }}</dd>
      </div>
      <div class="bot-tile__row">
        <dt>{{ $t('bots.status') }}</dt>
        <dd :class="`bot-tile__status--${status.tone}`">
          <span v-if="status.live" class="bot-tile__dot" aria-hidden="true" />
          {{ $t(status.labelKey) }}
        </dd>
      </div>
      <div class="bot-tile__row">
        <dt>{{ $t('bots.pnl_usdt') }}</dt>
        <dd class="bot-tile__pnl" :class="`bot-tile__pnl--${pnlTone(pnl)}`">{{ pnlLabel }}</dd>
      </div>
    </dl>

    <!-- Inline, not a tooltip: tooltips never open on touch. The full text is on the bot page -->
    <p v-if="actions.engineError" class="bot-tile__engine-error" :title="actions.engineError">
      {{ actions.engineError }}
    </p>

    <p v-if="actions.actionError" class="bot-tile__action-error" role="alert">
      {{ actions.actionError }}
    </p>

    <BotActionModals
      v-model:confirm-open="actions.confirmOpen"
      v-model:take-profit-open="actions.takeProfitOpen"
      v-model:stop-loss-open="actions.stopLossOpen"
      v-model:mixed-grid-open="actions.mixedGridOpen"
      :bot="bot"
      :confirm-copy="actions.confirmCopy"
      :confirm-loading="actions.confirmLoading"
      :can-edit-grid-config="actions.canEditGridConfig"
      :can-edit-mixed-grid="actions.canEditMixedGrid"
      @confirm="actions.confirmAction"
      @cancel="actions.cancelConfirm"
    />
  </motion.article>
</template>

<style scoped>
.bot-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: var(--radius-md);
  background: #0d0d12;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.bot-tile:hover {
  border-color: rgb(255 255 255 / 18%);
  background: #12121a;
}

.bot-tile--error,
.bot-tile--error:hover {
  border-color: var(--color-down-dim);
}

/* Colour, not opacity: opacity would make the rows a stacking context above the tile link */
.bot-tile--dim .bot-tile__symbol,
.bot-tile--dim .bot-tile__row dd {
  color: var(--color-text-muted);
}

.bot-tile__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bot-tile__star {
  position: relative;
  z-index: 2;
  display: inline-flex;
  flex: none;
  padding: 2px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: rgb(255 255 255 / 35%);
  cursor: pointer;
  transition: color 0.15s ease;
}

.bot-tile__star:hover {
  color: var(--color-accent);
}

.bot-tile__star--on {
  color: var(--color-accent);
}

.bot-tile__star svg {
  width: 15px;
  height: 15px;
}

.bot-tile__star--pop svg {
  animation: bot-tile-star-pop 0.45s ease;
}

@keyframes bot-tile-star-pop {
  40% {
    transform: scale(1.5) rotate(-18deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

.bot-tile__symbol {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

/* The whole tile is the link to the bot page; the star, menu and tooltip sit above it */
.bot-tile__symbol::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.bot-tile__symbol:focus-visible {
  outline: none;
}

.bot-tile__symbol:focus-visible::after {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.bot-tile__spacer {
  flex: 1;
}

.bot-tile__direction {
  flex: none;
  padding: 2px 9px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.bot-tile__direction--long {
  border-color: var(--color-up-dim);
  color: var(--color-up);
}

.bot-tile__direction--short {
  border-color: var(--color-down-dim);
  color: var(--color-down);
}

.bot-tile__menu {
  position: relative;
  z-index: 2;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.bot-tile__menu:hover,
.bot-tile__menu[data-state="open"] {
  background: rgb(255 255 255 / 8%);
  color: var(--color-text);
}

.bot-tile__menu-icon {
  width: 18px;
  height: 18px;
}

.bot-tile__menu-value {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.bot-tile__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.bot-tile__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
}

.bot-tile__row dt {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.bot-tile__row dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bot-tile__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentcolor;
  vertical-align: 1px;
  animation: bot-tile-pulse 2.4s ease-in-out infinite;
}

.bot-tile__status--live .bot-tile__dot {
  background: var(--color-up);
}

.bot-tile__status--warning {
  color: var(--color-warning);
}

.bot-tile__status--error {
  color: var(--color-down);
}

@keyframes bot-tile-pulse {
  50% {
    opacity: 0.45;
  }
}


.bot-tile__pnl--up {
  color: var(--color-up);
}

/* Losses stay white like the reference; switch to var(--color-down) for red */
.bot-tile__pnl--down {
  color: var(--color-text);
}

.bot-tile__pnl--flat {
  color: var(--color-text-muted);
}

.bot-tile__engine-error {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--color-down);
  font-size: 0.78rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.bot-tile__action-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.8rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .bot-tile {
    padding: 14px;
  }

  .bot-tile__menu {
    width: 36px;
    height: 36px;
    margin: -4px -6px -4px 0;
  }
}

@media (max-width: 374px) {
  .bot-tile__head {
    gap: 6px;
  }

  .bot-tile__direction {
    padding: 1px 7px;
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bot-tile,
  .bot-tile__dot,
  .bot-tile__star--pop svg {
    transition: none;
    animation: none;
  }
}
</style>
