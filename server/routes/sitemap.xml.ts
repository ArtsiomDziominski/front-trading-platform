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
  '/auth/register': '0.5',
  '/auth/login': '0.3',
}

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  const { locales, defaultLocale } = getSiteLocales()
  const lastmod = new Date().toISOString().slice(0, 10)

  const urls = INDEXABLE_PATHS.flatMap((path) => {
    const alternates = locales
      .map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${escapeXml(localizedUrl(path, code, defaultLocale))}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(path, defaultLocale, defaultLocale))}"/>`)
      .join('\n')

    return locales.map((code) => [
      '  <url>',
      `    <loc>${escapeXml(localizedUrl(path, code, defaultLocale))}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${PRIORITY[path] ?? '0.5'}</priority>`,
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
