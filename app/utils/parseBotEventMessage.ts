export type ParsedBotEventMessageField = {
  title: string
  description: string
}

export type ParsedBotEventMessage = {
  exchange: string | null
  primary: string | null
  fields: ParsedBotEventMessageField[]
  fallback: string | null
  parsed: boolean
}

const PRIMARY_KEYS = new Set(['msg', 'message', 'error', 'detail'])

/**
 * Parses engine/exchange error payloads like:
 * `binance {"code":-2008,"msg":"Invalid Api-Key ID."}`
 * Prefer human-readable `msg` as primary text; keep other fields as details.
 * Falls back to the original text when parsing fails.
 */
export function parseBotEventMessage(raw: string): ParsedBotEventMessage {
  const trimmed = raw.trim()
  if (!trimmed) {
    return emptyResult(raw)
  }

  const jsonStart = trimmed.indexOf('{')
  if (jsonStart === -1) {
    return emptyResult(trimmed)
  }

  const prefix = trimmed.slice(0, jsonStart).trim()
  const jsonPart = trimmed.slice(jsonStart)

  try {
    const parsed = JSON.parse(jsonPart) as unknown
    if (!isPlainObject(parsed)) {
      return emptyResult(trimmed)
    }

    const entries = Object.entries(parsed)
    if (!entries.length) {
      return emptyResult(trimmed)
    }

    const primaryEntry = entries.find(([key, value]) => (
      PRIMARY_KEYS.has(key.toLowerCase()) && typeof value === 'string' && Boolean(value.trim())
    ))

    const primary = primaryEntry ? String(primaryEntry[1]).trim() : null
    const primaryKey = primaryEntry?.[0]?.toLowerCase() ?? null

    const fields = entries
      .filter(([key]) => key.toLowerCase() !== primaryKey)
      .map(([key, value]) => ({
        title: key,
        description: formatFieldValue(value),
      }))

    return {
      exchange: prefix ? formatExchangeTitle(prefix) : null,
      primary,
      fields,
      fallback: null,
      parsed: true,
    }
  } catch {
    return emptyResult(trimmed)
  }
}

function emptyResult(fallback: string): ParsedBotEventMessage {
  return {
    exchange: null,
    primary: null,
    fields: [],
    fallback,
    parsed: false,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatFieldValue(value: unknown): string {
  if (value == null) return String(value)
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function formatExchangeTitle(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
