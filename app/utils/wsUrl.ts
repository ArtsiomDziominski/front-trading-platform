/** Builds ws(s)://host/ws?token=... from HTTP API base URL. */
export function buildBotsWebSocketUrl(apiBaseUrl: string, accessToken: string): string {
  const httpBase = apiBaseUrl.replace(/\/$/, '')
  const wsBase = httpBase.replace(/^http/, 'ws')
  return `${wsBase}/ws?token=${encodeURIComponent(accessToken)}`
}
