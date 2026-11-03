<script setup lang="ts">
const { t } = useI18n()

usePageSeo({
  title: () => t('seo.blog_title'),
  description: () => t('seo.blog_description'),
})

const { articles, status, error, refresh } = useArticleList()
</script>

<template>
  <main class="page-section">
    <div class="container blog-container">
      <header class="blog-header">
        <h1 class="section-title">
          {{ $t('blog.title') }}
        </h1>
        <p class="section-subtitle">
          {{ $t('blog.subtitle') }}
        </p>
      </header>

      <div v-if="articles.length" class="blog-list">
        <BlogArticleCard v-for="article in articles" :key="article.slug" :article="article" />
      </div>

      <p v-else-if="status === 'pending' || status === 'idle'" class="blog-state" role="status">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="blog-state" role="alert">
        <p>{{ $t('blog.load_error') }}</p>
        <AppButton variant="secondary" size="sm" @click="refresh()">
          {{ $t('common.retry') }}
        </AppButton>
      </div>

      <p v-else class="blog-state">
        {{ $t('blog.empty') }}
      </p>
    </div>
  </main>
</template>

<style scoped>
.blog-container {
  max-width: 820px;
}

.blog-header {
  margin-bottom: 8px;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 24px;
  color: var(--color-text-muted);
  text-align: center;
}

.blog-state p {
  margin: 0;
}
</style>
