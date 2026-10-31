import type { BotCreationLogOut, BotType } from '#shared/types/bot'

export type BotMarket = 'futures' | 'spot'

export interface BotMarketOption {
  value: BotMarket
  labelKey: string
  descKey: string
  icon: string
}

export interface BotCatalogEntry {
  market: BotMarket
  /** URL segment: the create page lives at `/bots/create/<market>/<slug>`. */
  slug: string
  botType: BotType
  titleKey: string
  descKey: string
  icon: string
  /** `false` — the backend does not accept this type yet: shown as "soon", no create page. */
  available: boolean
}

export const BOT_MARKETS: BotMarketOption[] = [
  { value: 'futures', labelKey: 'bots.market_futures', descKey: 'bots.market_futures_desc', icon: 'i-lucide-chart-candlestick' },
  { value: 'spot', labelKey: 'bots.market_spot', descKey: 'bots.market_spot_desc', icon: 'i-lucide-coins' },
]

/** Every bot the create flow knows about. A new type is one entry here plus its page under `pages/bots/create/`. */
export const BOT_CATALOG: BotCatalogEntry[] = [
  {
    market: 'futures',
    slug: 'grid',
    botType: 'GRID_FUTURES',
    titleKey: 'bots.catalog_grid',
    descKey: 'bots.catalog_grid_futures_desc',
    icon: 'i-lucide-grid-3x3',
    available: true,
  },
  {
    market: 'futures',
    slug: 'anti-martingale',
    botType: 'ANTI_MARTINGALE_FUTURES',
    titleKey: 'bots.catalog_anti_martingale',
    descKey: 'bots.catalog_anti_martingale_futures_desc',
    icon: 'i-lucide-trending-up',
    available: true,
  },
  {
    market: 'futures',
    slug: 'trend',
    botType: 'TREND_FUTURES',
    titleKey: 'bots.catalog_trend',
    descKey: 'bots.catalog_trend_futures_desc',
    icon: 'i-lucide-activity',
    available: true,
  },
  {
    market: 'futures',
    slug: 'dca',
    botType: 'DCA_FUTURES',
    titleKey: 'bots.catalog_dca',
    descKey: 'bots.catalog_dca_futures_desc',
    icon: 'i-lucide-layers',
    available: false,
  },
  {
    market: 'spot',
    slug: 'grid',
    botType: 'GRID_SPOT',
    titleKey: 'bots.catalog_grid',
    descKey: 'bots.catalog_grid_spot_desc',
    icon: 'i-lucide-grid-3x3',
    available: true,
  },
  {
    market: 'spot',
    slug: 'dca',
    botType: 'DCA_SPOT',
    titleKey: 'bots.catalog_dca',
    descKey: 'bots.catalog_dca_spot_desc',
    icon: 'i-lucide-layers',
    available: true,
  },
  {
    market: 'spot',
    slug: 'recurring',
    botType: 'RECURRING_SPOT',
    titleKey: 'bots.catalog_recurring',
    descKey: 'bots.catalog_recurring_spot_desc',
    icon: 'i-lucide-calendar-clock',
    available: true,
  },
  {
    market: 'spot',
    slug: 'trend',
    botType: 'TREND_SPOT',
    titleKey: 'bots.catalog_trend',
    descKey: 'bots.catalog_trend_spot_desc',
    icon: 'i-lucide-activity',
    available: true,
  },
]

export function catalogEntriesFor(market: BotMarket): BotCatalogEntry[] {
  return BOT_CATALOG.filter((entry) => entry.market === market)
}

export function isMarketAvailable(market: BotMarket): boolean {
  return BOT_CATALOG.some((entry) => entry.market === market && entry.available)
}

export function findCatalogEntry(market: BotMarket, slug: string): BotCatalogEntry | undefined {
  return BOT_CATALOG.find((entry) => entry.market === market && entry.slug === slug)
}

export function botCreatePath(entry: BotCatalogEntry): string {
  return `/bots/create/${entry.market}/${entry.slug}`
}

/** Log rows written before `bot_type` existed are grid futures bots: the backend default back then. */
export function creationLogBotType(item: BotCreationLogOut): BotType {
  if (item.bot_type) return item.bot_type
  const payloadType = item.request_payload?.bot_type
  return typeof payloadType === 'string' ? payloadType as BotType : 'GRID_FUTURES'
}
