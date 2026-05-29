<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuth()

useSeoMeta({
  title: () => t('auth.login_title'),
})

const status = ref<'loading' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const code = route.query.code
  const oauthError = route.query.error

  if (typeof oauthError === 'string') {
    status.value = 'error'
    message.value = oauthError
    return
  }

  if (typeof code !== 'string' || !code) {
    status.value = 'error'
    message.value = t('auth.error_google_callback')
    return
  }

  const redirectUri = `${window.location.origin}/auth/google/callback`

  try {
    await auth.completeGoogleLogin(code, redirectUri)
    await router.replace('/')
  } catch {
    status.value = 'error'
    message.value = auth.error.value || t('auth.error_unknown')
  }
})
</script>

<template>
  <main class="page-section auth-page">
    <div class="container auth-container">
      <UCard class="auth-card text-center">
        <p v-if="status === 'loading'" class="text-muted">
          {{ $t('common.loading') }}
        </p>
        <template v-else>
          <UAlert color="error" variant="subtle" :title="message" class="mb-5" />
          <UButton
            color="neutral"
            variant="outline"
            class="w-full justify-center"
            to="/auth/login"
          >
            {{ $t('auth.login_submit') }}
          </UButton>
        </template>
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  min-height: calc(100vh - 64px);
}

.auth-container {
  max-width: 420px;
}

.auth-card {
  padding: 40px 32px;
}
</style>
