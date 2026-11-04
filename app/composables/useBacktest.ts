import type { BacktestCreate, BacktestOut } from '#shared/types/backtest'
import { getApiErrorStatus, parseApiError } from '~/utils/parseApiError'

const POLL_MS = 2000
/** The worker gives up after 5 minutes; stop asking a little later. */
const POLL_LIMIT_MS = 6 * 60_000
const LIMIT_KEYS: Record<string, string> = {
  backtest_running: 'bots.backtest_limit_running',
  backtest_rate_limit: 'bots.backtest_limit_rate',
  backtest_busy: 'bots.backtest_limit_busy',
}

/**
 * One backtest panel: `run()` starts (or reuses) a backtest and polls GET /backtests/{id} until it is done,
 * `lookup()` only fetches a saved result (never starts a computation). The server computes an identical
 * backtest once a day for everyone, so repeated runs come back at once.
 */
export function useBacktest() {
  const { t } = useI18n()
  const config = useRuntimeConfig()
  const auth = useAuth()
  const baseUrl = config.public.apiBaseUrl

  const backtest = ref<BacktestOut | null>(null)
  const running = ref(false)
  const error = ref<string | null>(null)
  const startedAt = ref<number | null>(null)

  let generation = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  /** 429 carries a stable code in X-Backtest-Limit; other errors show the server's text. */
  function errorText(e: unknown): string {
    if (getApiErrorStatus(e) === 429) {
      const code = (e as { response?: { headers?: Headers } })?.response?.headers?.get?.('x-backtest-limit')
      const key = code ? LIMIT_KEYS[code] : undefined
      if (key) return t(key)
    }
    return parseApiError(e, t('bots.backtest_failed'))
  }

  function stopPolling() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  function post(body: BacktestCreate) {
    return auth.authFetch<BacktestOut>(`${baseUrl}/backtests`, { method: 'POST', body })
  }

  function finish(result: BacktestOut, current: number) {
    if (current !== generation) return
    backtest.value = result
    if (result.status === 'done' || result.status === 'failed') {
      running.value = false
      startedAt.value = null
      error.value = result.status === 'failed' ? (result.error || t('bots.backtest_failed')) : null
      return
    }
    if (startedAt.value != null && Date.now() - startedAt.value > POLL_LIMIT_MS) {
      running.value = false
      startedAt.value = null
      error.value = t('bots.backtest_timeout')
      return
    }
    timer = setTimeout(() => void poll(result.id, current), POLL_MS)
  }

  async function poll(id: number, current: number) {
    try {
      const result = await auth.authFetch<BacktestOut>(`${baseUrl}/backtests/${id}`)
      finish(result, current)
    } catch (e) {
      if (current !== generation) return
      // A network blip: keep polling until the time limit
      if (startedAt.value != null && Date.now() - startedAt.value < POLL_LIMIT_MS) {
        timer = setTimeout(() => void poll(id, current), POLL_MS * 2)
        return
      }
      running.value = false
      error.value = errorText(e)
    }
  }

  async function run(body: BacktestCreate) {
    stopPolling()
    const current = ++generation
    running.value = true
    error.value = null
    startedAt.value = Date.now()
    try {
      finish(await post({ ...body, cached_only: false }), current)
    } catch (e) {
      if (current !== generation) return
      running.value = false
      startedAt.value = null
      error.value = errorText(e)
    }
  }

  /** A saved result for these settings, or null. Errors are quiet: the user can still press Run. */
  async function lookup(body: BacktestCreate) {
    stopPolling()
    const current = ++generation
    running.value = false
    startedAt.value = null
    error.value = null
    try {
      const result = await post({ ...body, cached_only: true })
      if (current !== generation) return
      backtest.value = result
    } catch (e) {
      if (current !== generation) return
      backtest.value = null
      if (getApiErrorStatus(e) !== 404) error.value = errorText(e)
    }
  }

  /** Forget the shown result and any computation in flight (it keeps going on the server and is cached). */
  function reset() {
    stopPolling()
    generation += 1
    backtest.value = null
    running.value = false
    startedAt.value = null
    error.value = null
  }

  onScopeDispose(() => {
    generation += 1
    stopPolling()
  })

  return { backtest, running, error, startedAt, run, lookup, reset }
}
