<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()

useSeoMeta({
  title: () => t('auth.reset_password_title'),
})

const email = ref('')
const formError = ref('')
const sent = ref(false)

async function handleSubmit() {
  if (sent.value) return
  formError.value = ''
  auth.error.value = null

  if (!email.value) { formError.value = t('auth.error_required'); return }

  try {
    await auth.requestPasswordReset(email.value)
    sent.value = true
  } catch {
    formError.value = auth.error.value || t('auth.error_unknown')
  }
}
</script>

<template>
  <main class="page-section auth-page">
    <div class="container auth-container">
      <NeumoCard variant="raised" class="auth-card">
        <h1 class="auth-title">{{ $t('auth.reset_password_title') }}</h1>

        <template v-if="sent">
          <p class="auth-success">{{ $t('auth.reset_password_sent') }}</p>
          <NuxtLink to="/auth/login" class="auth-link auth-back">
            {{ $t('auth.register_link_login') }}
          </NuxtLink>
        </template>

        <template v-else>
          <form
            class="auth-form"
            method="post"
            action="/auth/reset-password"
            autocomplete="on"
            @submit.prevent="handleSubmit"
          >
            <div class="field">
              <label class="field-label" for="reset-email">{{ $t('auth.email') }}</label>
              <input
                id="reset-email"
                v-model="email"
                name="email"
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

            <p v-if="formError" class="auth-error">{{ formError }}</p>

            <NeumoButton
              variant="primary"
              size="lg"
              class="auth-submit"
              :disabled="auth.loading.value"
            >
              {{ auth.loading.value ? $t('common.loading') : $t('auth.reset_password_submit') }}
            </NeumoButton>
          </form>

          <div class="auth-links">
            <NuxtLink to="/auth/login" class="auth-link">
              {{ $t('auth.register_link_login') }}
            </NuxtLink>
          </div>
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

.auth-success {
  margin: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: rgb(32 201 151 / 12%);
  color: var(--color-accent);
  font-size: 0.95rem;
  text-align: center;
  line-height: 1.5;
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

.auth-back {
  display: block;
  text-align: center;
  margin-top: 20px;
}
</style>
