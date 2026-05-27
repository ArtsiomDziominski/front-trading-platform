<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <main class="error-page">
    <p class="eyebrow">Ошибка</p>
    <h1>{{ error.statusCode }}</h1>
    <p>{{ error.statusMessage || 'Что-то пошло не так.' }}</p>
    <button type="button" class="button" @click="handleError">
      На главную
    </button>
  </main>
</template>

