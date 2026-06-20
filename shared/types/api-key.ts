export type ExchangeType = 'BINANCE' | 'BYBIT' | 'OKX' | 'OTHER'

export interface ApiKeyOut {
  id: number
  exchange: ExchangeType
  label: string
  api_key_masked: string
  has_passphrase?: boolean
  created_at: string
}

export interface ApiKeyCreate {
  exchange?: ExchangeType
  api_key: string
  api_secret: string
  api_passphrase?: string
  label?: string
}
