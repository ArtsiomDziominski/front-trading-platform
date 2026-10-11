import { botCreatePath, findCatalogEntry, type BotMarket } from '~/utils/botCatalog'

/** Market + type choice shared by the create modal on `/bots` and the `/bots/create` page. */
export function useBotTypePicker() {
  const market = ref<BotMarket>('futures')
  const type = ref<string | null>(null)

  const selectedEntry = computed(() => {
    if (!type.value) return undefined
    const entry = findCatalogEntry(market.value, type.value)
    return entry?.available ? entry : undefined
  })

  function reset() {
    market.value = 'futures'
    type.value = null
  }

  /** Opens the chosen bot's create page; `false` when nothing is picked yet. */
  async function openSelected(): Promise<boolean> {
    const entry = selectedEntry.value
    if (!entry) return false
    await navigateTo(botCreatePath(entry))
    return true
  }

  return { market, type, selectedEntry, reset, openSelected }
}
