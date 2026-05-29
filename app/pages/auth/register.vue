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
      <UCard class="auth-card">
        <h1 class="auth-title">{{ $t('auth.register_title') }}</h1>

        <form
          id="register-form"
          class="auth-form"
          method="post"
          action="/auth/register"
          autocomplete="on"
          @submit.prevent="handleSubmit"
        >
          <UFormField :label="$t('auth.name')">
            <UInput
              id="register-name"
              v-model="name"
              name="name"
              type="text"
              :placeholder="$t('auth.name')"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('auth.email')">
            <UInput
              id="register-email"
              v-model="email"
              name="email"
              type="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              :placeholder="$t('auth.email')"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('auth.password')">
            <UInput
              id="register-password"
              v-model="password"
              name="new-password"
              type="password"
              :placeholder="$t('auth.password')"
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
            name="submit"
            :loading="auth.loading.value"
            block
          >
            {{ auth.loading.value ? $t('common.loading') : $t('auth.register_submit') }}
          </UButton>
        </form>

        <div class="auth-links">
          <span class="auth-link-text">
            {{ $t('auth.register_have_account') }}
            <NuxtLink to="/auth/login" class="auth-link">
              {{ $t('auth.register_link_login') }}
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

.auth-link-text {
  color: var(--color-text-muted);
}
</style>
