<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <main class="error-page page-section">
    <div class="container text-center">
      <p class="section-label">Ошибка</p>
      <h1 class="section-title">{{ error.statusCode }}</h1>
      <p class="section-subtitle">{{ error.statusMessage || 'Что-то пошло не так.' }}</p>
      <UButton class="mt-6" @click="handleError">
        На главную
      </UButton>
    </div>
  </main>
</template>
