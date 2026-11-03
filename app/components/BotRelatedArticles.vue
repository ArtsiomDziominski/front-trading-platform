<script setup lang="ts">
import type { BotType } from '#shared/types/bot'

/** Blog articles about a bot type, shown on its create page. Renders nothing when there are none. */
const props = defineProps<{
  botType: BotType
}>()

const { articles } = useArticleList({ botType: () => props.botType, limit: 3 })
</script>

<template>
  <section v-if="articles.length" class="related-articles" aria-labelledby="related-articles-title">
    <p id="related-articles-title" class="related-articles__label">
      <UIcon name="i-lucide-book-open" class="related-articles__icon" aria-hidden="true" />
      {{ $t('blog.related_title') }}
    </p>
    <BlogArticleCard v-for="article in articles" :key="article.slug" :article="article" compact />
  </section>
</template>

<style scoped>
.related-articles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.related-articles__label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.related-articles__icon {
  width: 1rem;
  height: 1rem;
}
</style>
