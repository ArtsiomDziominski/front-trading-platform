<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('exchanges.title'),
  description: () => t('exchanges.subtitle'),
})
</script>

<template>
  <main class="page-section">
    <div class="container">
      <div class="section-header">
        <span class="section-label">{{ $t('exchanges.title') }}</span>
        <h1 class="section-title">{{ $t('exchanges.subtitle') }}</h1>
      </div>

      <div class="grid-2cols">
        <ExchangeCard
          name="Binance"
          :description="$t('exchanges.binance_desc')"
          icon="&#11088;"
          :active="true"
        />
        <ExchangeCard
          name="Bybit"
          :description="$t('exchanges.bybit_desc')"
          icon="&#9632;"
          :active="false"
        />
        <ExchangeCard
          name="OKX"
          :description="$t('exchanges.okx_desc')"
          icon="&#9670;"
          :active="false"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: 36px;
}
</style>
