export type ExchangeType = 'BINANCE' | 'BYBIT' | 'OKX' | 'OTHER'

export interface ApiKeyOut {
  id: number
  exchange: ExchangeType
  label: string
  api_key_masked: string
  has_passphrase?: boolean
  created_at: string
}
