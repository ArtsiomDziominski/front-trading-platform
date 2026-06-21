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
      <UCard class="auth-card">
        <h1 class="auth-title">{{ $t('auth.login_title') }}</h1>

        <form
          id="login-form"
          class="auth-form"
          method="post"
          action="/auth/login"
          autocomplete="on"
          @submit.prevent="handleSubmit"
        >
          <UFormField :label="$t('auth.email')">
            <UInput
              id="login-email"
              v-model="email"
              name="username"
              type="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              :placeholder="$t('auth.email')"
              autocomplete="username"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('auth.password')">
            <UInput
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              :placeholder="$t('auth.password')"
              autocomplete="current-password"
              required
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :title="formError"
          />

          <UButton
            class="w-full justify-center"
            size="lg"
            type="submit"
            name="submit"
            :loading="auth.loading.value"
            block
          >
            {{ auth.loading.value ? $t('common.loading') : $t('auth.login_submit') }}
          </UButton>
        </form>

        <USeparator :label="$t('auth.login_or')" class="my-6" />

        <div class="auth-oauth">
          <UButton
            color="neutral"
            variant="outline"
            class="w-full justify-center"
            type="button"
            :disabled="auth.loading.value"
            @click="handleGoogleLogin"
          >
            {{ $t('auth.login_google') }}
          </UButton>

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
      </UCard>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  min-height: calc(100vh - 64px);
  min-height: calc(100dvh - 64px);
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

.auth-oauth {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
