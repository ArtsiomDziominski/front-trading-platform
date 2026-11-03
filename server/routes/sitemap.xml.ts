import type { ArticleList } from '#shared/types/article'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PRIORITY: Record<string, string> = {
  '/': '1.0',
  '/bots/overview': '0.9',
  '/exchanges': '0.8',
  '/blog': '0.7',
  '/auth/register': '0.5',
  '/auth/login': '0.3',
}

interface SitemapEntry {
  path: string
  lastmod: string
  changefreq: string
  priority: string
}

/** Blog articles from the backend; the sitemap still answers (without them) when the API is down. */
async function articleEntries(): Promise<SitemapEntry[]> {
  const baseUrl = String(useRuntimeConfig().public.apiBaseUrl).replace(/\/+$/, '')
  try {
    const list = await $fetch<ArticleList>(`${baseUrl}/articles`, { query: { limit: 100 }, timeout: 3000 })
    return list.items.map((article) => ({
      path: `/blog/${article.slug}`,
      lastmod: article.updated_at ?? article.published_at,
      changefreq: 'monthly',
      priority: '0.6',
    }))
  }
  catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  const { locales, defaultLocale } = getSiteLocales()
  const today = new Date().toISOString().slice(0, 10)

  const entries: SitemapEntry[] = [
    ...INDEXABLE_PATHS.map((path) => ({ path, lastmod: today, changefreq: 'weekly', priority: PRIORITY[path] ?? '0.5' })),
    ...(await articleEntries()),
  ]

  const urls = entries.flatMap(({ path, lastmod, changefreq, priority }) => {
    const alternates = locales
      .map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${escapeXml(localizedUrl(path, code, defaultLocale))}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(path, defaultLocale, defaultLocale))}"/>`)
      .join('\n')

    return locales.map((code) => [
      '  <url>',
      `    <loc>${escapeXml(localizedUrl(path, code, defaultLocale))}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      alternates,
      '  </url>',
    ].join('\n'))
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
})
