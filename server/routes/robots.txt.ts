export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  if (!isSiteIndexable()) {
    return 'User-agent: *\nDisallow: /\n'
  }

  const { locales, defaultLocale } = getSiteLocales()
  const prefixes = ['', ...locales.filter((code) => code !== defaultLocale).map((code) => `/${code}`)]
  const privatePaths = [
    '/bots$',
    '/bots/',
    '/settings',
    '/history',
    '/auth/google/',
    '/auth/reset-password',
  ]

  const lines = ['User-agent: *', 'Allow: /']
  for (const prefix of prefixes) {
    lines.push(`Allow: ${prefix}/bots/overview`)
    for (const path of privatePaths) {
      lines.push(`Disallow: ${prefix}${path}`)
    }
  }
  lines.push('', `Sitemap: ${getSiteUrl()}/sitemap.xml`, '')

  return lines.join('\n')
})
