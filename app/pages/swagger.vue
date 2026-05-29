<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig()
const apiBase = config.public.apiBaseUrl

useSeoMeta({
  title: () => t('api.title'),
  description: () => t('api.subtitle'),
})

let SwaggerUIBundle: any

onMounted(async () => {
  SwaggerUIBundle = (await import('swagger-ui-dist')).SwaggerUIBundle
  SwaggerUIBundle({
    url: `${apiBase}/openapi.json`,
    dom_id: '#swagger-ui',
    presets: [
      SwaggerUIBundle.presets.apis,
    ],
    layout: 'BaseLayout',
    deepLinking: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tryItOutEnabled: true,
    syntaxHighlight: {
      theme: 'agate',
    },
  })
})
</script>

<template>
  <main class="page-section">
    <div class="container">
      <div class="section-header">
        <span class="section-label">Swagger UI</span>
        <h1 class="section-title">{{ $t('api.title') }}</h1>
        <p class="section-subtitle">{{ $t('api.subtitle') }}</p>
      </div>
      <UCard class="swagger-wrapper">
        <div id="swagger-ui" />
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: 36px;
}

.swagger-wrapper {
  padding: 4px;
  overflow: hidden;
}

:deep(.swagger-ui) {
  color: var(--color-text);
}

:deep(.swagger-ui .info) {
  margin: 20px;
}

:deep(.swagger-ui .info .title) {
  color: var(--color-text);
}

:deep(.swagger-ui .info .description p) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .opblock-tag) {
  color: var(--color-text);
  border-bottom-color: var(--color-border);
}

:deep(.swagger-ui .opblock-tag:hover) {
  background: var(--color-surface-alt);
}

:deep(.swagger-ui .opblock) {
  border: none;
  border-radius: 14px;
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-sm);
  margin: 0 0 12px;
}

:deep(.swagger-ui .opblock .opblock-summary) {
  border-bottom: 1px solid var(--color-border);
}

:deep(.swagger-ui .opblock .opblock-summary-description) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .opblock-body) {
  background: var(--color-surface-alt);
}

:deep(.swagger-ui .opblock-body pre) {
  background: var(--color-surface-muted);
  border-radius: 8px;
}

:deep(.swagger-ui .opblock-body .opblock-section-header) {
  background: var(--color-surface);
  border: none;
  box-shadow: var(--shadow-inset-sm);
  border-radius: 8px;
}

:deep(.swagger-ui .opblock-body .opblock-section-header h4) {
  color: var(--color-text);
}

:deep(.swagger-ui .opblock-body .opblock-section-header label) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui table thead tr td, .swagger-ui table thead tr th) {
  border-bottom-color: var(--color-border);
  color: var(--color-text-muted);
}

:deep(.swagger-ui table tbody tr td) {
  color: var(--color-text);
}

:deep(.swagger-ui .response-col_status) {
  color: var(--color-text);
}

:deep(.swagger-ui .response-col_description) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .btn) {
  border: none;
  border-radius: 14px;
  background: var(--color-surface-alt);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

:deep(.swagger-ui .btn:hover) {
  box-shadow: var(--shadow-md);
}

:deep(.swagger-ui .btn:active) {
  box-shadow: var(--shadow-inset-sm);
}

:deep(.swagger-ui .btn.execute) {
  background: var(--color-accent);
  color: #fff;
}

:deep(.swagger-ui .opblock-control-arrow) {
  fill: var(--color-text);
}

:deep(.swagger-ui .model-box) {
  color: var(--color-text);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px;
}

:deep(.swagger-ui .model) {
  color: var(--color-text);
}

:deep(.swagger-ui .model-title) {
  color: var(--color-text);
}

:deep(.swagger-ui .prop-type) {
  color: var(--color-accent);
}

:deep(.swagger-ui .model-toggle) {
  fill: var(--color-text);
}

:deep(.swagger-ui select) {
  border: none;
  border-radius: 8px;
  background: var(--color-surface-alt);
  color: var(--color-text);
  box-shadow: var(--shadow-inset-sm);
}

:deep(.swagger-ui input[type=text]) {
  border: none;
  border-radius: 8px;
  background: var(--color-surface-alt);
  color: var(--color-text);
  box-shadow: var(--shadow-inset-sm);
}

:deep(.swagger-ui textarea) {
  border: none;
  border-radius: 8px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  box-shadow: var(--shadow-inset-sm);
}

:deep(.swagger-ui .parameter__name) {
  color: var(--color-text);
}

:deep(.swagger-ui .parameter__type) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .info .title small) {
  background: var(--color-surface);
  border-radius: 8px;
}

:deep(.swagger-ui .scheme-container) {
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-inset-sm);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}

:deep(.swagger-ui .scheme-container .schemes-title) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .auth-wrapper .authorize) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

:deep(.swagger-ui .auth-container) {
  border-bottom-color: var(--color-border);
}

:deep(.swagger-ui .auth-container h4, .swagger-ui .auth-container h5) {
  color: var(--color-text);
}

:deep(.swagger-ui .dialog-ux .backdrop-ux) {
  background: rgb(15 23 42 / 40%);
}

:deep(.swagger-ui .dialog-ux .modal-ux) {
  background: var(--color-surface-alt);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
}

:deep(.swagger-ui .dialog-ux .modal-ux-header) {
  border-bottom-color: var(--color-border);
}

:deep(.swagger-ui .dialog-ux .modal-ux-header h3) {
  color: var(--color-text);
}

:deep(.swagger-ui .dialog-ux .modal-ux-content h4) {
  color: var(--color-text);
}

:deep(.swagger-ui .dialog-ux .modal-ux-content p) {
  color: var(--color-text-muted);
}

:deep(.swagger-ui .auth-btn-wrapper .btn-done) {
  background: var(--color-accent);
  color: #fff;
}

:deep(.swagger-ui .topbar) {
  display: none;
}

:deep(.swagger-ui .response-control-media-type__accept-message) {
  color: var(--color-accent);
}

:deep(.swagger-ui .loading-container) {
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
