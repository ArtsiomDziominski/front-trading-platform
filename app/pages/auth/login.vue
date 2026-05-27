<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()
const router = useRouter()
const config = useRuntimeConfig()

useSeoMeta({
  title: () => t('auth.login_title'),
})

const email = ref('')
const password = ref('')
const formError = ref('')
const browserCredentials = useBrowserCredentials()

const showTelegram = computed(() => Boolean(config.public.telegramBotUsername?.trim()))

onMounted(async () => {
  const saved = await browserCredentials.loadLogin()
  if (saved) {
    email.value = saved.email
    password.value = saved.password
  }
})

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function handleSubmit() {
  formError.value = ''
  auth.error.value = null

  if (!email.value.trim()) {
    formError.value = t('auth.error_required')
    return
  }

  if (!validateEmail(email.value.trim())) {
    formError.value = t('auth.error_email_invalid')
    return
  }

  if (!password.value) {
    formError.value = t('auth.error_required')
    return
  }

  const loginEmail = email.value.trim()
  const loginPassword = password.value

  try {
    await auth.login(loginEmail, loginPassword)
    await browserCredentials.storeLogin(loginEmail, loginPassword)
    await router.push('/')
  } catch {
    formError.value = auth.error.value || t('auth.error_unknown')
  }
}

async function handleGoogleLogin() {
  formError.value = ''
  auth.error.value = null

  try {
    await auth.startGoogleLogin()
  } catch {
    formError.value = auth.error.value || t('auth.error_unknown')
  }
}

function handleTelegramSuccess() {
  router.push('/')
}

function handleTelegramError(message: string) {
  formError.value = message
}
</script>

<template>
  <main class="page-section auth-page">
    <div class="container auth-container">
      <NeumoCard variant="raised" class="auth-card">
        <h1 class="auth-title">{{ $t('auth.login_title') }}</h1>

        <form
          id="login-form"
          class="auth-form"
          method="post"
          action="/auth/login"
          autocomplete="on"
          @submit.prevent="handleSubmit"
        >
          <div class="field">
            <label class="field-label" for="login-email">{{ $t('auth.email') }}</label>
            <input
              id="login-email"
              v-model="email"
              name="username"
              type="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              class="field-input neumo-sm-inset"
              :placeholder="$t('auth.email')"
              autocomplete="username"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="login-password">{{ $t('auth.password') }}</label>
            <input
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              class="field-input neumo-sm-inset"
              :placeholder="$t('auth.password')"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="formError" class="auth-error" role="alert">{{ formError }}</p>

          <NeumoButton
            variant="primary"
            size="lg"
            class="auth-submit"
            type="submit"
            name="submit"
            :disabled="auth.loading.value"
          >
            {{ auth.loading.value ? $t('common.loading') : $t('auth.login_submit') }}
          </NeumoButton>
        </form>

        <div class="auth-divider">
          <span>{{ $t('auth.login_or') }}</span>
        </div>

        <div class="auth-oauth">
          <NeumoButton
            variant="secondary"
            size="md"
            class="auth-oauth-btn"
            type="button"
            :disabled="auth.loading.value"
            @click="handleGoogleLogin"
          >
            {{ $t('auth.login_google') }}
          </NeumoButton>

          <TelegramLogin
            v-if="showTelegram"
            @success="handleTelegramSuccess"
            @error="handleTelegramError"
          />
        </div>

        <div class="auth-links">
          <NuxtLink to="/auth/reset-password" class="auth-link">
            {{ $t('auth.login_forgot_password') }}
          </NuxtLink>
          <span class="auth-link-text">
            {{ $t('auth.login_no_account') }}
            <NuxtLink to="/auth/register" class="auth-link">
              {{ $t('auth.login_link_register') }}
            </NuxtLink>
          </span>
        </div>
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

.auth-title {
  margin: 0 0 28px;
  font-size: 1.6rem;
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.field-input {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: box-shadow 0.2s;
}

.field-input:focus {
  box-shadow: var(--shadow-sm);
}

.auth-submit {
  width: 100%;
  margin-top: 8px;
}

.auth-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgb(255 92 122 / 12%);
  color: var(--color-danger);
  font-size: 0.88rem;
  text-align: center;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 20px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.auth-divider::before,
.auth-divider::after {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  content: '';
}

.auth-oauth {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-oauth-btn {
  width: 100%;
}

.auth-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  font-size: 0.9rem;
}

.auth-link {
  color: var(--color-accent);
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}

.auth-link-text {
  color: var(--color-text-muted);
}
</style>
