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
      <NeumoCard variant="raised" class="auth-card auth-card--compact">
        <p v-if="status === 'loading'" class="auth-status">
          {{ $t('common.loading') }}
        </p>
        <template v-else>
          <p class="auth-error">{{ message }}</p>
          <NeumoButton variant="secondary" size="md" tag="NuxtLink" to="/auth/login" class="auth-back">
            {{ $t('auth.login_submit') }}
          </NeumoButton>
        </template>
      </NeumoCard>
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

.auth-card--compact {
  text-align: center;
}

.auth-status {
  margin: 0;
  color: var(--color-text-muted);
}

.auth-error {
  margin: 0 0 20px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgb(255 92 122 / 12%);
  color: var(--color-danger);
  font-size: 0.88rem;
}

.auth-back {
  width: 100%;
}
</style>
