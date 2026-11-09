<script setup lang="ts">
import type { ArticleSummary } from '#shared/types/article'
import { formatLongDate } from '~/utils/formatNumber'

/** An article in the blog list; `compact` is the smaller card shown next to a bot form. */
const props = defineProps<{
  article: ArticleSummary
  compact?: boolean
}>()

const { t, te, locale } = useI18n()
const appPath = useAppPath()

const date = computed(() => formatLongDate(props.article.published_at, locale.value))
const tags = computed(() => props.article.tags.map((tag) => (te(`blog.tags.${tag}`) ? t(`blog.tags.${tag}`) : tag)))
</script>

<template>
  <NuxtLink
    :to="appPath(`/blog/${article.slug}`)"
    class="article-card"
    :class="{ 'article-card--compact': compact }"
  >
    <p class="article-card__meta">
      <time :datetime="article.published_at">{{ date }}</time>
      <span aria-hidden="true">·</span>
      <span>{{ $t('blog.reading_minutes', { n: article.reading_minutes }) }}</span>
    </p>
    <component :is="compact ? 'h3' : 'h2'" class="article-card__title">
      {{ article.title }}
    </component>
    <p class="article-card__summary">
      {{ article.summary }}
    </p>
    <div class="article-card__footer">
      <ul v-if="!compact && tags.length" class="article-card__tags" :aria-label="$t('blog.tags_label')">
        <li v-for="tag in tags" :key="tag">
          {{ tag }}
        </li>
      </ul>
      <span class="article-card__more">
        {{ $t('blog.read') }}
        <UIcon name="i-lucide-arrow-right" class="article-card__more-icon" aria-hidden="true" />
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.article-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 24px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: var(--radius-lg);
  background: #0d0d12;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.article-card:hover,
.article-card:focus-visible {
  border-color: rgb(196 181 253 / 40%);
  background: #111118;
}

.article-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.article-card__title {
  margin: 0;
  color: #fff;
  font-family: Inter, "DM Sans", ui-sans-serif, system-ui, sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.article-card__summary {
  margin: 0;
  color: rgb(255 255 255 / 72%);
  line-height: 1.6;
}

.article-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
}

.article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.article-card__tags li {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 6%);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.article-card__more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--color-accent);
  font-size: 0.9rem;
  font-weight: 600;
}

.article-card__more-icon {
  width: 1rem;
  height: 1rem;
}

.article-card--compact {
  gap: 6px;
  padding: 16px 18px;
  border-radius: var(--radius-md);
}

.article-card--compact .article-card__title {
  font-size: 1.05rem;
}

.article-card--compact .article-card__summary {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.92rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

@media (max-width: 640px) {
  .article-card {
    padding: 18px;
  }

  .article-card__title {
    font-size: 1.2rem;
  }
}
</style>
