import type { MaybeRefOrGetter } from 'vue'
import { StopLossMode, TakeProfitMode, type BotListItem } from '#shared/types/bot'
import { engineErrorText } from '~/utils/botView'
import { isMixedConfig } from '~/utils/mixedGrid'
import { formatOrderSizeBadge } from '~/utils/orderSize'
import { formatStopLossBadge, parseStopLoss } from '~/utils/stopLoss'
import { formatTakeProfitBadge, parseTakeProfit } from '~/utils/takeProfit'

export type BotConfirmAction = 'close' | 'redeploy' | 'remove'

export interface BotConfirmCopy {
  title: string
  message: string
  confirmLabel: string
  variant: 'primary' | 'danger'
}

/**
 * Everything one bot's controls need, shared by the list card menu and the bot page:
 * which actions are allowed, their loading and error state, confirmations and the edit modals.
 * Returned as a reactive object, so templates read `actions.canStop` without `.value`.
 */
export function useBotActions(
  source: MaybeRefOrGetter<BotListItem>,
  options: {
    /** Called with `true` right before the remove request and with `false` if it fails. */
    onRemoving?: (value: boolean) => void
    onRemoved?: () => void | Promise<void>
  } = {},
) {
  const { t } = useI18n()
  const {
    stopBot,
    closeBot,
    redeployBotGrid,
    removeBot,
    toggleBotFavorite,
    isBotActionLoading,
    getBotActionError,
    clearBotActionError,
  } = useBots()

  const bot = computed(() => toValue(source))

  const isGrid = computed(() => bot.value.bot_type === 'GRID_FUTURES')
  const isMixedGrid = computed(() => isGrid.value && isMixedConfig(bot.value.config))

  const canStop = computed(() => bot.value.lifecycle_status === 'ACTIVE')
  const canClose = computed(() => bot.value.lifecycle_status !== 'CLOSED')
  const canRedeploy = computed(() => isGrid.value && bot.value.lifecycle_status === 'ACTIVE')
  const canEditGridConfig = computed(() => isGrid.value && bot.value.lifecycle_status !== 'CLOSED')
  const canEditMixedGrid = computed(() => canEditGridConfig.value && isMixedGrid.value)
  const canRemove = computed(() => !bot.value.deleted_at)

  const isBusy = computed(() => isBotActionLoading(bot.value.id))
  const actionError = computed(() => getBotActionError(bot.value.id))
  const engineError = computed(() => engineErrorText(bot.value))

  const takeProfitLabel = computed(() => formatTakeProfitBadge(bot.value.config, t))
  const hasTakeProfit = computed(() => parseTakeProfit(bot.value.config).mode !== TakeProfitMode.Off)
  const stopLossLabel = computed(() => formatStopLossBadge(bot.value.config, t))
  const hasStopLoss = computed(() => parseStopLoss(bot.value.config).mode !== StopLossMode.Off)
  /** Short values for menu rows next to the action name: `10%`, `25 USDT`, `выкл.` */
  const takeProfitValue = computed(() => {
    const { mode, percent, amount } = parseTakeProfit(bot.value.config)
    if (mode === TakeProfitMode.Percent && percent != null) return `${percent}%`
    if (mode === TakeProfitMode.Amount && amount != null) return `${amount} USDT`
    return t('bots.value_off')
  })
  const stopLossValue = computed(() => {
    const { mode, percent } = parseStopLoss(bot.value.config)
    return mode === StopLossMode.Percent && percent != null ? `${percent}%` : t('bots.value_off')
  })
  const orderSizeLabel = computed(() => (isGrid.value ? formatOrderSizeBadge(bot.value.config, bot.value.symbol, t) : null))
  const mixedOrdersCount = computed(() => {
    if (!isMixedGrid.value) return null
    const orders = (bot.value.config.mixed_grid as { orders?: unknown[] } | undefined)?.orders
    return Array.isArray(orders) ? orders.length : 0
  })

  const confirmOpen = ref(false)
  const confirmLoading = ref(false)
  const pendingAction = ref<BotConfirmAction | null>(null)
  /** The API message of the last failed confirm action, shown inside the still open dialog (e.g. a DCA close whose sell is not confirmed yet, or a busy bot). */
  const confirmError = ref<string | null>(null)
  const takeProfitOpen = ref(false)
  const stopLossOpen = ref(false)
  const mixedGridOpen = ref(false)

  const confirmCopy = computed<BotConfirmCopy>(() => {
    const symbol = bot.value.symbol
    switch (pendingAction.value) {
      case 'close':
        return {
          title: t('bots.confirm_close_title', { symbol }),
          // Spot DCA sells only the coins it bought; there is no futures position to close
          message: bot.value.bot_type === 'DCA_SPOT'
            ? t('bots.dca_confirm_close', { symbol })
            : bot.value.bot_type === 'RECURRING_SPOT'
              ? t('bots.recurring_confirm_close', { symbol })
              : bot.value.bot_type === 'GRID_SPOT'
                ? t('bots.grid_spot_confirm_close', { symbol })
                : t('bots.confirm_close', { symbol }),
          confirmLabel: t('bots.action_close'),
          variant: 'primary',
        }
      case 'redeploy':
        return {
          title: t('bots.confirm_redeploy_title', { symbol }),
          message: t('bots.confirm_redeploy', { symbol }),
          confirmLabel: t('bots.action_redeploy'),
          variant: 'primary',
        }
      case 'remove':
        return {
          title: t('bots.confirm_remove_title', { symbol }),
          message: t('bots.confirm_remove', { symbol }),
          confirmLabel: t('bots.action_remove'),
          variant: 'danger',
        }
      default:
        return { title: '', message: '', confirmLabel: t('common.confirm'), variant: 'primary' }
    }
  })

  function openConfirm(action: BotConfirmAction) {
    if (isBusy.value) return
    pendingAction.value = action
    confirmError.value = null
    confirmOpen.value = true
  }

  function cancelConfirm() {
    if (confirmLoading.value) return
    confirmOpen.value = false
    pendingAction.value = null
    confirmError.value = null
  }

  async function confirmAction() {
    const action = pendingAction.value
    if (!action) return

    const id = bot.value.id
    confirmLoading.value = true
    confirmError.value = null
    clearBotActionError(id)

    try {
      if (action === 'close') {
        await closeBot(id)
      } else if (action === 'redeploy') {
        await redeployBotGrid(id)
      } else {
        options.onRemoving?.(true)
        await removeBot(id)
        await options.onRemoved?.()
      }
      confirmOpen.value = false
      pendingAction.value = null
    } catch {
      // The backend message is shown in the dialog (and next to the bot); the dialog stays open for a retry
      confirmError.value = getBotActionError(id) || t('bots.action_error')
      if (action === 'remove') options.onRemoving?.(false)
    } finally {
      confirmLoading.value = false
    }
  }

  async function stop() {
    if (isBusy.value) return
    clearBotActionError(bot.value.id)
    try {
      await stopBot(bot.value.id)
    } catch {
      // shown next to the bot
    }
  }

  const favoritePop = ref(false)

  async function toggleFavorite() {
    // Restart the pop animation on every click
    favoritePop.value = false
    await nextTick()
    favoritePop.value = true
    setTimeout(() => { favoritePop.value = false }, 500)

    try {
      await toggleBotFavorite(bot.value.id, !bot.value.favorite)
    } catch {
      // shown as a toast
    }
  }

  function openTakeProfit() {
    if (!isBusy.value) takeProfitOpen.value = true
  }

  function openStopLoss() {
    if (!isBusy.value) stopLossOpen.value = true
  }

  function openMixedGrid() {
    if (!isBusy.value) mixedGridOpen.value = true
  }

  function isLoading(actionKey: string) {
    return isBotActionLoading(bot.value.id, actionKey)
  }

  return reactive({
    isGrid,
    isMixedGrid,
    canStop,
    canClose,
    canRedeploy,
    canEditGridConfig,
    canEditMixedGrid,
    canRemove,
    isBusy,
    actionError,
    engineError,
    takeProfitLabel,
    hasTakeProfit,
    stopLossLabel,
    hasStopLoss,
    takeProfitValue,
    stopLossValue,
    orderSizeLabel,
    mixedOrdersCount,
    confirmOpen,
    confirmLoading,
    confirmError,
    confirmCopy,
    takeProfitOpen,
    stopLossOpen,
    mixedGridOpen,
    favoritePop,
    openConfirm,
    cancelConfirm,
    openTakeProfit,
    openStopLoss,
    openMixedGrid,
    confirmAction,
    stop,
    toggleFavorite,
    isLoading,
  })
}

export type BotActions = ReturnType<typeof useBotActions>
