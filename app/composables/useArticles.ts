import type { MaybeRefOrGetter } from 'vue'
import type { Article, ArticleList } from '#shared/types/article'
import type { BotType } from '#shared/types/bot'

/*
 * Blog articles from the public API, in the site's current language. The data is fetched during SSR, so the
 * pages are indexable; if that request failed, the browser tries once more after hydration. The keys include
 * the locale, so switching the language refetches.
 */

function retryAfterHydration(error: Ref<unknown>, refresh: () => Promise<void>) {
  if (!import.meta.client || !useNuxtApp().isHydrating) return
  onMounted(() => {
    if (error.value) refresh()
  })
}

export function useArticleList(options: { botType?: MaybeRefOrGetter<BotType | undefined>, limit?: number } = {}) {
  const { locale } = useI18n()
  const baseUrl = useRuntimeConfig().public.apiBaseUrl

  const { data, status, error, refresh } = useAsyncData(
    () => `articles:${locale.value}:${toValue(options.botType) ?? 'all'}:${options.limit ?? 'default'}`,
    () => $fetch<ArticleList>(`${baseUrl}/articles`, {
      query: { lang: locale.value, bot_type: toValue(options.botType), limit: options.limit },
    }),
  )
  retryAfterHydration(error, refresh)

  return {
    articles: computed(() => data.value?.items ?? []),
    status,
    error,
    refresh,
  }
}

/** Awaitable, so a page can answer 404 during SSR. */
export function useArticle(slug: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  const baseUrl = useRuntimeConfig().public.apiBaseUrl

  const result = useAsyncData(
    () => `article:${toValue(slug)}:${locale.value}`,
    () => $fetch<Article>(`${baseUrl}/articles/${encodeURIComponent(toValue(slug))}`, {
      query: { lang: locale.value },
    }),
  )
  retryAfterHydration(result.error, result.refresh)

  return result
}
