<script setup lang="ts">
import { formatLongDate } from '~/utils/formatNumber'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/+$/, '')

const slug = computed(() => String(route.params.slug ?? ''))
const { data: article, status, error, refresh } = await useArticle(slug)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: t('blog.not_found'), fatal: true })
}

const published = computed(() => (article.value ? formatLongDate(article.value.published_at, locale.value) : ''))
const updated = computed(() => {
  const value = article.value?.updated_at
  return value && value !== article.value?.published_at ? formatLongDate(value, locale.value) : ''
})
/** The article has no translation into the site's language and came in another one. */
const isFallback = computed(() => Boolean(article.value && article.value.lang !== locale.value))

usePageSeo({
  title: () => article.value?.title ?? t('blog.title'),
  description: () => article.value?.summary ?? t('seo.blog_description'),
})

useSeoMeta({
  ogType: 'article',
  articlePublishedTime: () => article.value?.published_at,
  articleModifiedTime: () => article.value?.updated_at ?? undefined,
})

const structuredData = computed(() => {
  const value = article.value
  if (!value) return null
  const url = `${siteUrl}${localePath({ name: 'blog-slug', params: { slug: value.slug } })}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': value.title,
    'description': value.summary,
    'datePublished': value.published_at,
    'dateModified': value.updated_at ?? value.published_at,
    'inLanguage': value.lang,
    'url': url,
    'mainEntityOfPage': url,
    'image': `${siteUrl}/og/botinex-${value.lang === 'en' ? 'en' : 'ru'}.jpg`,
    'keywords': value.tags.join(', '),
    'author': { '@type': 'Organization', 'name': 'Botinex', 'url': `${siteUrl}/` },
    'publisher': { '@id': `${siteUrl}/#organization`, '@type': 'Organization', 'name': 'Botinex' },
    ...(value.source ? { isBasedOn: value.source.url } : {}),
  }
})

useHead(() => ({
  script: structuredData.value
    ? [{
        key: 'ld-json-article',
        type: 'application/ld+json',
        // "<" escaped so text in the article can never close the script tag
        innerHTML: JSON.stringify(structuredData.value).replace(/</g, '\\u003c'),
      }]
    : [],
}))
</script>

<template>
  <main class="page-section">
    <div class="container article-container">
      <NuxtLink :to="localePath({ name: 'blog' })" class="article-back">
        <UIcon name="i-lucide-arrow-left" class="article-back__icon" aria-hidden="true" />
        {{ $t('blog.back') }}
      </NuxtLink>

      <article v-if="article" class="article" :lang="article.lang">
        <header class="article__header">
          <p class="article__meta">
            <time :datetime="article.published_at">{{ published }}</time>
            <template v-if="updated">
              <span aria-hidden="true">·</span>
              <span>{{ $t('blog.updated', { date: updated }) }}</span>
            </template>
            <span aria-hidden="true">·</span>
            <span>{{ $t('blog.reading_minutes', { n: article.reading_minutes }) }}</span>
          </p>
          <h1 class="article__title">
            {{ article.title }}
          </h1>
          <p class="article__summary">
            {{ article.summary }}
          </p>
          <p v-if="isFallback" class="article__fallback" :lang="locale">
            {{ $t('blog.fallback_note') }}
          </p>
        </header>

        <ArticleBody :blocks="article.body" />

        <footer v-if="article.source" class="article__footer" :lang="locale">
          <span>{{ $t('blog.source') }}:</span>
          <a :href="article.source.url" target="_blank" rel="noopener noreferrer nofollow">
            {{ article.source.title }}
            <UIcon name="i-lucide-external-link" class="article__footer-icon" aria-hidden="true" />
          </a>
        </footer>
      </article>

      <p v-else-if="status === 'pending' || status === 'idle'" class="article-state" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else class="article-state" role="alert">
        <p>{{ error?.statusCode === 404 ? $t('blog.not_found') : $t('blog.article_error') }}</p>
        <AppButton v-if="error?.statusCode !== 404" variant="secondary" size="sm" @click="refresh()">
          {{ $t('common.retry') }}
        </AppButton>
      </div>
    </div>
  </main>
</template>

<style scoped>
.article-container {
  max-width: 760px;
}

.article-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 28px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.article-back:hover {
  color: #fff;
}

.article-back__icon {
  width: 1rem;
  height: 1rem;
}

.article__header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 32px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--color-border);
}

.article__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.article__title {
  margin: 0;
  color: #fff;
  font-family: Inter, "DM Sans", ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.8rem, 4.2vw, 2.6rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
}

.article__summary {
  margin: 0;
  color: rgb(255 255 255 / 72%);
  font-size: 1.1rem;
  line-height: 1.6;
}

.article__fallback {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgb(255 255 255 / 5%);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.article__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.article__footer a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-accent);
  text-decoration: none;
}

.article__footer a:hover {
  text-decoration: underline;
}

.article__footer-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.article-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 24px;
  color: var(--color-text-muted);
  text-align: center;
}

.article-state p {
  margin: 0;
}

@media (max-width: 640px) {
  .article-back {
    margin-bottom: 20px;
  }

  .article__header {
    margin-bottom: 24px;
    padding-bottom: 20px;
  }

  .article__summary {
    font-size: 1rem;
  }
}
</style>
