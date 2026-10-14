export default defineEventHandler((event) => {
  if (!isSiteIndexable()) {
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  }
})
