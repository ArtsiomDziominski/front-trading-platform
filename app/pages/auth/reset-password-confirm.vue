<script setup lang="ts">
const { t } = useI18n()
const auth = useAuth()
const route = useRoute()

useSeoMeta({
  title: () => t('auth.reset_password_confirm_title'),
})

const token = ref(route.query.token as string || '')
const newPassword = ref('')
const formError = ref('')
const success = ref(false)

async function handleSubmit() {
  formError.value = ''
  auth.error.value = null

  if (!token.value) { formError.value = t('auth.error_required'); return }
  if (!newPassword.value) { formError.value = t('auth.error_required'); return }
  if (newPassword.value.length < 8) { formError.value = t('auth.error_password_min'); return }

  try {
    await auth.confirmPasswordReset(token.value, newPassword.value)
    success.value = true
  } catch {
    formError.value = auth.error.value || t('auth.error_unknown')
  }
}
</script>

<template>
  <main class="page-section auth-page">
    <div class="container auth-container">
      <UCard class="auth-card">
        <h1 class="auth-title">{{ $t('auth.reset_password_confirm_title') }}</h1>

        <template v-if="success">
          <UAlert color="success" variant="subtle" :title="$t('auth.reset_password_confirm_success')" />
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
            action="/auth/reset-password/confirm"
            autocomplete="on"
            @submit.prevent="handleSubmit"
          >
            <UFormField label="Token">
              <UInput
                id="reset-token"
                v-model="token"
                name="token"
                type="text"
                placeholder="Token"
                autocomplete="off"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('auth.reset_password_new_password')">
              <UInput
                id="reset-new-password"
                v-model="newPassword"
                name="new-password"
                type="password"
                :placeholder="$t('auth.reset_password_new_password')"
                autocomplete="new-password"
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
              {{ auth.loading.value ? $t('common.loading') : $t('auth.reset_password_confirm_submit') }}
            </UButton>
          </form>
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
</style>
