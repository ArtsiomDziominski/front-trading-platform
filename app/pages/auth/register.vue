<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()
const router = useRouter()

useSeoMeta({
  title: () => t('auth.register_title'),
})

const email = ref('')
const password = ref('')
const name = ref('')
const formError = ref('')
const browserCredentials = useBrowserCredentials()

async function handleSubmit() {
  formError.value = ''
  auth.error.value = null

  if (!email.value) { formError.value = t('auth.error_required'); return }
  if (!password.value) { formError.value = t('auth.error_required'); return }
  if (password.value.length < 8) { formError.value = t('auth.error_password_min'); return }

  const registerEmail = email.value.trim()

  try {
    await auth.register(registerEmail, password.value, name.value || undefined)
    await browserCredentials.storeLogin(registerEmail, password.value)
    await router.push('/')
  } catch {
    formError.value = auth.error.value || t('auth.error_unknown')
  }
}
</script>

<template>
  <main class="page-section auth-page">
    <div class="container auth-container">
      <NeumoCard variant="raised" class="auth-card">
        <h1 class="auth-title">{{ $t('auth.register_title') }}</h1>

        <form
          id="register-form"
          class="auth-form"
          method="post"
          action="/auth/register"
          autocomplete="on"
          @submit.prevent="handleSubmit"
        >
          <div class="field">
            <label class="field-label" for="register-name">{{ $t('auth.name') }}</label>
            <input
              id="register-name"
              v-model="name"
              name="name"
              type="text"
              class="field-input neumo-sm-inset"
              :placeholder="$t('auth.name')"
              autocomplete="name"
            />
          </div>

          <div class="field">
            <label class="field-label" for="register-email">{{ $t('auth.email') }}</label>
            <input
              id="register-email"
              v-model="email"
              name="email"
              type="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              class="field-input neumo-sm-inset"
              :placeholder="$t('auth.email')"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="register-password">{{ $t('auth.password') }}</label>
            <input
              id="register-password"
              v-model="password"
              name="new-password"
              type="password"
              class="field-input neumo-sm-inset"
              :placeholder="$t('auth.password')"
              autocomplete="new-password"
              required
            />
          </div>

          <p v-if="formError" class="auth-error">{{ formError }}</p>

          <NeumoButton
            variant="primary"
            size="lg"
            class="auth-submit"
            type="submit"
            name="submit"
            :disabled="auth.loading.value"
          >
            {{ auth.loading.value ? $t('common.loading') : $t('auth.register_submit') }}
          </NeumoButton>
        </form>

        <div class="auth-links">
          <span class="auth-link-text">
            {{ $t('auth.register_have_account') }}
            <NuxtLink to="/auth/login" class="auth-link">
              {{ $t('auth.register_link_login') }}
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
