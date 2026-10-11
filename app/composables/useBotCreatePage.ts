import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotCreate, BotCreationLogOut, BotType } from '#shared/types/bot'
import { creationLogBotType } from '~/utils/botCatalog'
import { parseApiError } from '~/utils/parseApiError'
import { parseBotCreatePayload } from '~/utils/parseBotCreatePayload'

/** The history has no `bot_type` filter on the backend, so a wider page is filtered here. */
const CREATION_HISTORY_LIMIT = 100

interface BotCreatePageOptions {
  /** Fills the page's form from a creation log entry; `false` if the entry does not fit the form. */
  applyPayload: (payload: BotCreate, keys: ApiKeyOut[]) => boolean
  /** Runs after a history entry was copied into the form. */
  onCloned?: () => void
  /** Load the user's bots too (needed when the form checks for duplicates). */
  loadBots?: boolean
}

/** Data and actions every `/bots/create/<market>/<type>` page needs, scoped to one bot type. */
export function useBotCreatePage(botType: BotType, options: BotCreatePageOptions) {
  const { t } = useI18n()
  const toast = useToast()
  const { bots, fetchBots, fetchApiKeys, fetchCreationHistory, setCreationLogFavorite } = useBots()

  const apiKeys = ref<ApiKeyOut[]>([])
  const keysLoading = ref(true)
  const pageError = ref('')
  const apiKeyId = ref<number | ''>('')
  const clonedFromId = ref<number | null>(null)

  const creationHistory = ref<BotCreationLogOut[]>([])
  const historyLoading = ref(false)
  const historyError = ref<string | null>(null)
  const historyFavoritesOnly = ref(false)

  async function loadCreationHistory() {
    historyLoading.value = true
    historyError.value = null

    try {
      const items = await fetchCreationHistory(CREATION_HISTORY_LIMIT, historyFavoritesOnly.value ? true : undefined)
      creationHistory.value = items.filter((item) => creationLogBotType(item) === botType)
    } catch {
      historyError.value = t('bots.creation_history_load_error')
      creationHistory.value = []
    } finally {
      historyLoading.value = false
    }
  }

  async function loadPageData() {
    keysLoading.value = true
    try {
      apiKeys.value = await fetchApiKeys()
      if (apiKeys.value.length === 1) {
        const onlyKey = apiKeys.value[0]
        if (onlyKey) {
          apiKeyId.value = onlyKey.id
        }
      }
      await Promise.all([loadCreationHistory(), options.loadBots ? fetchBots() : Promise.resolve()])
    } catch {
      pageError.value = t('bots.create_error')
    } finally {
      keysLoading.value = false
    }
  }

  async function toggleHistoryFavorite(item: BotCreationLogOut) {
    const next = !item.favorite
    try {
      const updated = await setCreationLogFavorite(item.id, next)
      if (historyFavoritesOnly.value && !updated.favorite) {
        creationHistory.value = creationHistory.value.filter((entry) => entry.id !== item.id)
        return
      }
      creationHistory.value = creationHistory.value
        .map((entry) => (entry.id === item.id ? { ...entry, favorite: updated.favorite } : entry))
        .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)))
    } catch (e) {
      toast.add({ title: parseApiError(e, t('bots.action_error')), color: 'error' })
    }
  }

  function cloneFromHistory(item: BotCreationLogOut) {
    const payload = parseBotCreatePayload(item.request_payload)
    if (!payload || !options.applyPayload(payload, apiKeys.value)) {
      pageError.value = t('bots.creation_history_clone_error')
      return
    }

    pageError.value = ''
    clonedFromId.value = item.id
    options.onCloned?.()
  }

  async function handleBotCreated() {
    await loadCreationHistory()
    clonedFromId.value = null
  }

  watch(historyFavoritesOnly, () => {
    loadCreationHistory()
  })

  onMounted(() => {
    loadPageData()
  })

  return {
    bots,
    apiKeys,
    keysLoading,
    pageError,
    apiKeyId,
    clonedFromId,
    creationHistory,
    historyLoading,
    historyError,
    historyFavoritesOnly,
    loadCreationHistory,
    toggleHistoryFavorite,
    cloneFromHistory,
    handleBotCreated,
  }
}
