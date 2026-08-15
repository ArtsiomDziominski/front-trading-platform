import type { ExchangeType } from '#shared/types/api-key'
import type { BotHistoryFilters, BotHistoryQuery } from '#shared/types/bot'

export const BOT_HISTORY_PAGE_SIZE = 50

const EXCHANGES: ExchangeType[] = ['BINANCE', 'BYBIT', 'OKX', 'OTHER']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatIsoWithOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function dateInputToFromIso(dateInput: string): string {
  const [year = 0, month = 1, day = 1] = dateInput.split('-').map(Number)
  return formatIsoWithOffset(new Date(year, month - 1, day, 0, 0, 0))
}

export function dateInputToToIso(dateInput: string): string {
  const [year = 0, month = 1, day = 1] = dateInput.split('-').map(Number)
  return formatIsoWithOffset(new Date(year, month - 1, day, 23, 59, 59))
}

export function parseExchangeQuery(value: unknown): ExchangeType | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return undefined
  return EXCHANGES.find((item) => item === raw)
}

export function parseBotIdQuery(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return undefined
  return id
}

export function compactBotHistoryQuery(query: BotHistoryQuery): Record<string, string | number> | undefined {
  const result: Record<string, string | number> = {}

  if (query.bot_id != null) result.bot_id = query.bot_id
  if (query.created_from) result.created_from = query.created_from
  if (query.created_to) result.created_to = query.created_to
  if (query.exchange) result.exchange = query.exchange
  if (query.skip != null) result.skip = query.skip
  if (query.limit != null) result.limit = query.limit

  if (!Object.keys(result).length) return undefined
  return result
}

export function hasBotHistoryFilters(filters: BotHistoryFilters): boolean {
  return Boolean(filters.bot_id || filters.created_from || filters.created_to || filters.exchange)
}

export function buildHistoryFilters(input: {
  botId?: number
  exchange?: ExchangeType
  dateFrom?: string
  dateTo?: string
}): BotHistoryFilters {
  return {
    bot_id: input.botId,
    exchange: input.exchange,
    created_from: input.dateFrom ? dateInputToFromIso(input.dateFrom) : undefined,
    created_to: input.dateTo ? dateInputToToIso(input.dateTo) : undefined,
  }
}
