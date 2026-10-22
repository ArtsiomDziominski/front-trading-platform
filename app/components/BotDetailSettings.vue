<script setup lang="ts">
import type { BotListItem } from '#shared/types/bot'
import {
  CREATION_SETTING_LABEL_KEYS,
  extractCreationHistorySettings,
  formatCreationSettingValue,
  type CreationSettingKey,
} from '~/utils/formatBotCreationSettings'
import { isMixedConfig } from '~/utils/mixedGrid'

/** Every saved setting of the bot, in the same wording as the create form. */
const props = defineProps<{
  bot: BotListItem
  takeProfitValue: string
  stopLossValue: string
}>()

const { t } = useI18n()

// Shown elsewhere on the page (header, anti-martingale ladder) or replaced by the rows below
const SKIPPED: CreationSettingKey[] = [
  'bot_type',
  'api_key_id',
  'symbol',
  'orders_summary',
  'take_profit_percent',
  'take_profit_amount',
  'stop_loss_percent',
]

const LABEL_OVERRIDES: Partial<Record<CreationSettingKey, string>> = {
  start_price: 'bots.detail_start_price',
}

interface SettingRow {
  key: string
  label: string
  value: string
}

const rows = computed<SettingRow[]>(() => {
  const isGrid = props.bot.bot_type === 'GRID_FUTURES'
  const config = props.bot.config
  // A mixed grid sizes every order itself: the legacy volume mode is stored but not used
  const skipped = isMixedConfig(config) ? [...SKIPPED, 'volume_mode'] : SKIPPED
  const settings = extractCreationHistorySettings({ bot_type: props.bot.bot_type, config }, props.bot.symbol)
    .filter((setting) => !skipped.includes(setting.key))

  const result: SettingRow[] = []
  if (isGrid) {
    result.push({
      key: 'sizing_mode',
      label: t('bots.sizing_mode'),
      value: isMixedConfig(config) ? t('bots.sizing_mode_mixed') : t('bots.sizing_mode_legacy'),
    })
  }

  for (const setting of settings) {
    result.push({
      key: setting.key,
      label: t(LABEL_OVERRIDES[setting.key] ?? CREATION_SETTING_LABEL_KEYS[setting.key]),
      value: formatCreationSettingValue(setting, t),
    })
  }

  if (isGrid) {
    if (!settings.some((setting) => setting.key === 'start_price')) {
      result.push({ key: 'start_price', label: t('bots.detail_start_price'), value: t('bots.detail_start_price_market') })
    }
    result.push(
      { key: 'take_profit', label: t('bots.take_profit_edit'), value: props.takeProfitValue },
      { key: 'stop_loss', label: t('bots.stop_loss_edit'), value: props.stopLossValue },
    )
  }

  // Trend bots: `capital_usdt: null` means the account balance taken when the bot started
  if (props.bot.bot_type === 'TREND_FUTURES' && !settings.some((setting) => setting.key === 'capital_usdt')) {
    const index = result.findIndex((row) => row.key === 'max_units')
    const row = { key: 'capital_usdt', label: t('bots.trend_field_capital_usdt'), value: t('bots.trend_capital_from_balance') }
    if (index >= 0) result.splice(index + 1, 0, row)
    else result.push(row)
  }

  if (props.bot.bot_type === 'ANTI_MARTINGALE_FUTURES' && config.leverage != null) {
    const leverage = result.find((row) => row.key === 'leverage')
    if (leverage) leverage.value = `${leverage.value}×`
  }

  return result
})
</script>

<template>
  <section v-if="rows.length" class="detail-panel" :aria-labelledby="`settings-title-${bot.id}`">
    <div class="detail-panel__head">
      <h2 :id="`settings-title-${bot.id}`" class="detail-panel__title">{{ $t('bots.detail_settings') }}</h2>
    </div>
    <dl class="detail-list">
      <div v-for="row in rows" :key="row.key" class="detail-list__row">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>
  </section>
</template>
