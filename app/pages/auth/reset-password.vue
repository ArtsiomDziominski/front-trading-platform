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
      <UCard class="auth-card">
        <h1 class="auth-title">{{ $t('auth.reset_password_title') }}</h1>

        <template v-if="sent">
          <UAlert color="success" variant="subtle" :title="$t('auth.reset_password_sent')" />
          <UButton
            class="mt-5 w-full justify-center"
            color="neutral"
            variant="outline"
            to="/auth/login"
          >
            {{ $t('auth.register_link_login') }}
          </UButton>
        </template>

        <template v-else>
          <form
            class="auth-form"
            method="post"
            action="/auth/reset-password"
            autocomplete="on"
            @submit.prevent="handleSubmit"
          >
            <UFormField :label="$t('auth.email')">
              <UInput
                id="reset-email"
                v-model="email"
                name="email"
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

            <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

            <UButton
              class="w-full justify-center"
              size="lg"
              type="submit"
              :loading="auth.loading.value"
              block
            >
              {{ auth.loading.value ? $t('common.loading') : $t('auth.reset_password_submit') }}
            </UButton>
          </form>

          <div class="auth-links">
            <NuxtLink to="/auth/login" class="auth-link">
              {{ $t('auth.register_link_login') }}
            </NuxtLink>
          </div>
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
</style>
