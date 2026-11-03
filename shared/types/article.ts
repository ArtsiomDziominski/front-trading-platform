/** Blog articles (GET /articles, GET /articles/{slug}); see the backend's docs/ru/frontend-articles.md. */
import type { BotType } from './bot'

/** Plain-text blocks: render them as text, never as HTML. Skip a type the front does not know yet. */
export type ArticleBlock =
  | { type: 'heading', text: string }
  | { type: 'paragraph', text: string }
  | { type: 'list', items: string[], ordered?: boolean }
  /** Monospace box; lines are split by \n. */
  | { type: 'formula', text: string }
  | { type: 'callout', tone: 'info' | 'warning', text: string }
  | { type: 'table', columns: string[], rows: string[][] }
  /** Button to a page of the site; `href` is always an internal path such as /bots/create/futures/bilateral. */
  | { type: 'cta', text: string, href: string }

export interface ArticleSource {
  title: string
  url: string
}

export interface ArticleSummary {
  slug: string
  /** Language of the text: the requested one, or a fallback when the article has no such translation. */
  lang: string
  languages: string[]
  title: string
  summary: string
  /** YYYY-MM-DD */
  published_at: string
  updated_at: string | null
  tags: string[]
  bot_types: BotType[]
  reading_minutes: number
}

export interface Article extends ArticleSummary {
  source: ArticleSource | null
  body: ArticleBlock[]
}

export interface ArticleList {
  items: ArticleSummary[]
  /** Articles matching the filter, regardless of limit/offset. */
  total: number
}
