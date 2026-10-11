import type { BotCreate } from '#shared/types/bot'

/**
 * Submit flow shared by every create form: base checks, POST /bots, the engine warning and the
 * redirect to `/bots`. Field errors stay in the form: `handleError` returns `true` once it showed one.
 */
export function useBotCreateSubmit(onCreated: () => void) {
  const { t } = useI18n()
  const router = useRouter()
  const { creating, createError, createBot } = useBots()

  const formError = ref('')
  const engineWarning = ref('')
  const createdBotId = ref<number | null>(null)

  function resetSubmitState() {
    formError.value = ''
    engineWarning.value = ''
    createdBotId.value = null
    createError.value = null
  }

  /** API key and symbol are required by every bot type. */
  function validateBase(apiKeyId: number | '', symbol: string): boolean {
    if (!apiKeyId) {
      formError.value = t('bots.error_api_key_required')
      return false
    }

    if (symbol.trim().toUpperCase().length < 3) {
      formError.value = t('bots.error_symbol_required')
      return false
    }

    return true
  }

  async function submit(payload: BotCreate, handleError: (error: unknown) => boolean = () => false) {
    try {
      const bot = await createBot(payload)
      onCreated()

      if (bot.engine_state === 'ERROR' && bot.engine_error) {
        createdBotId.value = bot.id
        engineWarning.value = t('bots.create_engine_warning', { error: bot.engine_error })
        return
      }

      await router.push('/bots')
    } catch (error) {
      if (handleError(error)) return
      formError.value = createError.value || t('bots.create_error')
    }
  }

  return {
    creating,
    formError,
    engineWarning,
    createdBotId,
    resetSubmitState,
    validateBase,
    submit,
  }
}
