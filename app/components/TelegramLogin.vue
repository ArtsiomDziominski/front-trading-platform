<script setup lang="ts">
import type { TelegramAuthPayload } from '~/composables/useAuth'

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const config = useRuntimeConfig()
const auth = useAuth()
const botUsername = computed(() => config.public.telegramBotUsername?.trim() || '')

const containerRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!botUsername.value || !containerRef.value) {
    return
  }

  ;(window as Window & { onTelegramAuth?: (user: TelegramAuthPayload) => void }).onTelegramAuth
    = async (user) => {
      auth.error.value = null

      try {
        await auth.loginWithTelegram(user)
        emit('success')
      } catch {
        emit('error', auth.error.value || 'Telegram auth failed')
      }
    }

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', botUsername.value)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '8')
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')

  containerRef.value.innerHTML = ''
  containerRef.value.appendChild(script)
})
</script>

<template>
  <div v-if="botUsername" ref="containerRef" class="telegram-login" />
</template>

<style scoped>
.telegram-login {
  display: flex;
  justify-content: center;
  min-height: 44px;
}
</style>
