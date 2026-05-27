type ValidationErrorItem = {
  msg?: string
  loc?: unknown[]
}

export function parseApiError(error: unknown, fallback: string): string {
  const err = error as { data?: { detail?: string | ValidationErrorItem[] } }
  const detail = err?.data?.detail

  if (!detail) {
    return fallback
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'string' ? item : item?.msg))
      .filter(Boolean)

    return messages.length > 0 ? messages.join(', ') : fallback
  }

  return fallback
}
