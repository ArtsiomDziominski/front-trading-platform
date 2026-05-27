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
      theme: 'monokai',
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
      <NeumoCard variant="raised" class="swagger-wrapper">
        <div id="swagger-ui" />
      </NeumoCard>
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
  color: #e8ecf1;
}

:deep(.swagger-ui .info) {
  margin: 20px;
}

:deep(.swagger-ui .info .title) {
  color: #e8ecf1;
}

:deep(.swagger-ui .info .description p) {
  color: #8a94a6;
}

:deep(.swagger-ui .opblock-tag) {
  color: #e8ecf1;
  border-bottom-color: #2d323a;
}

:deep(.swagger-ui .opblock-tag:hover) {
  background: #23272e;
}

:deep(.swagger-ui .opblock) {
  border: none;
  border-radius: 14px;
  background: #23272e;
  box-shadow: 4px 4px 8px #0c0e11, -4px -4px 8px #343941;
  margin: 0 0 12px;
}

:deep(.swagger-ui .opblock .opblock-summary) {
  border-bottom: 1px solid #2d323a;
}

:deep(.swagger-ui .opblock .opblock-summary-description) {
  color: #8a94a6;
}

:deep(.swagger-ui .opblock-body) {
  background: #23272e;
}

:deep(.swagger-ui .opblock-body pre) {
  background: #1a1d23;
  border-radius: 8px;
}

:deep(.swagger-ui .opblock-body .opblock-section-header) {
  background: #2b3038;
  border: none;
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
  border-radius: 8px;
}

:deep(.swagger-ui .opblock-body .opblock-section-header h4) {
  color: #e8ecf1;
}

:deep(.swagger-ui .opblock-body .opblock-section-header label) {
  color: #8a94a6;
}

:deep(.swagger-ui table thead tr td, .swagger-ui table thead tr th) {
  border-bottom-color: #2d323a;
  color: #8a94a6;
}

:deep(.swagger-ui table tbody tr td) {
  color: #e8ecf1;
}

:deep(.swagger-ui .response-col_status) {
  color: #e8ecf1;
}

:deep(.swagger-ui .response-col_description) {
  color: #8a94a6;
}

:deep(.swagger-ui .btn) {
  border: none;
  border-radius: 14px;
  background: #23272e;
  color: #e8ecf1;
  box-shadow: 4px 4px 8px #0c0e11, -4px -4px 8px #343941;
  transition: all 0.2s;
}

:deep(.swagger-ui .btn:hover) {
  box-shadow: 6px 6px 12px #0c0e11, -6px -6px 12px #343941;
}

:deep(.swagger-ui .btn:active) {
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
}

:deep(.swagger-ui .btn.execute) {
  background: #20c997;
  color: #04100c;
}

:deep(.swagger-ui .opblock-control-arrow) {
  fill: #e8ecf1;
}

:deep(.swagger-ui .model-box) {
  color: #e8ecf1;
  background: #2b3038;
  border-radius: 8px;
  padding: 8px;
}

:deep(.swagger-ui .model) {
  color: #e8ecf1;
}

:deep(.swagger-ui .model-title) {
  color: #e8ecf1;
}

:deep(.swagger-ui .prop-type) {
  color: #20c997;
}

:deep(.swagger-ui .model-toggle) {
  fill: #e8ecf1;
}

:deep(.swagger-ui select) {
  border: none;
  border-radius: 8px;
  background: #2b3038;
  color: #e8ecf1;
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
}

:deep(.swagger-ui input[type=text]) {
  border: none;
  border-radius: 8px;
  background: #2b3038;
  color: #e8ecf1;
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
}

:deep(.swagger-ui textarea) {
  border: none;
  border-radius: 8px;
  background: #1a1d23;
  color: #e8ecf1;
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
}

:deep(.swagger-ui .parameter__name) {
  color: #e8ecf1;
}

:deep(.swagger-ui .parameter__type) {
  color: #8a94a6;
}

:deep(.swagger-ui .info .title small) {
  background: #2b3038;
  border-radius: 8px;
}

:deep(.swagger-ui .scheme-container) {
  background: #23272e;
  box-shadow: inset 3px 3px 6px #0c0e11, inset -3px -3px 6px #343941;
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}

:deep(.swagger-ui .scheme-container .schemes-title) {
  color: #8a94a6;
}

:deep(.swagger-ui .auth-wrapper .authorize) {
  border-color: #20c997;
  color: #20c997;
}

:deep(.swagger-ui .auth-container) {
  border-bottom-color: #2d323a;
}

:deep(.swagger-ui .auth-container h4, .swagger-ui .auth-container h5) {
  color: #e8ecf1;
}

:deep(.swagger-ui .dialog-ux .backdrop-ux) {
  background: rgba(0, 0, 0, 0.6);
}

:deep(.swagger-ui .dialog-ux .modal-ux) {
  background: #23272e;
  border-radius: 18px;
  box-shadow: 12px 12px 24px #0c0e11, -12px -12px 24px #343941;
}

:deep(.swagger-ui .dialog-ux .modal-ux-header) {
  border-bottom-color: #2d323a;
}

:deep(.swagger-ui .dialog-ux .modal-ux-header h3) {
  color: #e8ecf1;
}

:deep(.swagger-ui .dialog-ux .modal-ux-content h4) {
  color: #e8ecf1;
}

:deep(.swagger-ui .dialog-ux .modal-ux-content p) {
  color: #8a94a6;
}

:deep(.swagger-ui .auth-btn-wrapper .btn-done) {
  background: #20c997;
  color: #04100c;
}

:deep(.swagger-ui .topbar) {
  display: none;
}

:deep(.swagger-ui .response-control-media-type__accept-message) {
  color: #20c997;
}

:deep(.swagger-ui .loading-container) {
  padding: 40px;
  text-align: center;
  color: #8a94a6;
}
</style>
