<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const auth = useAuth()
const userSettings = useUserSettings()

useSeoMeta({
  title: () => t('settings.title'),
})

const name = ref('')
const profileError = ref('')
const profileSuccess = ref(false)

const passwordError = ref('')
const passwordSent = ref(false)

const roleLabels: Record<string, string> = {
  USER: 'settings.role_user',
  VIP: 'settings.role_vip',
  SUPPORT: 'settings.role_support',
  ADMIN: 'settings.role_admin',
  SUPERADMIN: 'settings.role_superadmin',
}

function syncFormFromUser() {
  const u = auth.user.value
  if (!u) return
  name.value = u.name ?? ''
}

onMounted(async () => {
  if (!auth.user.value) {
    await auth.fetchUser()
  }
  syncFormFromUser()
  await userSettings.fetchSettings()
})

watch(() => auth.user.value, syncFormFromUser)

async function handleProfileSubmit() {
  profileError.value = ''
  profileSuccess.value = false

  try {
    await auth.updateProfile({
      name: name.value.trim() || null,
    })
    profileSuccess.value = true
  } catch {
    profileError.value = auth.error.value || t('auth.error_unknown')
  }
}

async function handlePasswordReset() {
  passwordError.value = ''
  passwordSent.value = false

  const email = auth.user.value?.email
  if (!email) {
    passwordError.value = t('auth.error_unknown')
    return
  }

  try {
    await auth.requestPasswordReset(email)
    passwordSent.value = true
  } catch {
    passwordError.value = auth.error.value || t('auth.error_unknown')
  }
}
</script>

<template>
  <main class="page-section settings-page">
    <div class="container settings-container">
      <div class="page-header">
        <div>
          <span class="section-label">{{ $t('settings.title') }}</span>
          <h1 class="section-title">{{ $t('settings.subtitle') }}</h1>
        </div>
      </div>

      <div class="settings-grid">
        <NeumoCard variant="raised" class="settings-card">
          <h2 class="settings-card__title">{{ $t('settings.profile_section') }}</h2>

          <form class="settings-form" @submit.prevent="handleProfileSubmit">
            <div class="field">
              <label class="field-label" for="settings-name">{{ $t('auth.name') }}</label>
              <input
                id="settings-name"
                v-model="name"
                type="text"
                class="field-input neumo-sm-inset"
                :placeholder="$t('auth.name')"
                autocomplete="name"
              />
            </div>

            <div class="field">
              <label class="field-label" for="settings-email">{{ $t('auth.email') }}</label>
              <input
                id="settings-email"
                :value="auth.user.value?.email ?? ''"
                type="email"
                class="field-input neumo-sm-inset field-input--readonly"
                disabled
                readonly
              />
              <p class="field-hint">{{ $t('settings.email_readonly_hint') }}</p>
            </div>

            <div v-if="auth.user.value" class="field field--inline">
              <label class="field-label" for="settings-role">{{ $t('settings.role') }}</label>
              <span id="settings-role" class="role-badge">
                {{ $t(roleLabels[auth.user.value.role] ?? 'settings.role_user') }}
              </span>
            </div>

            <p v-if="profileError" class="form-message form-message--error" role="alert">
              {{ profileError }}
            </p>
            <p v-if="profileSuccess" class="form-message form-message--success" role="status">
              {{ $t('settings.profile_saved') }}
            </p>

            <NeumoButton
              variant="primary"
              size="md"
              type="submit"
              :disabled="auth.loading.value"
            >
              {{ auth.loading.value ? $t('common.loading') : $t('settings.save_profile') }}
            </NeumoButton>
          </form>
        </NeumoCard>

        <SettingsTelegramCard />

        <NeumoCard variant="raised" class="settings-card">
          <h2 class="settings-card__title">{{ $t('settings.security_section') }}</h2>
          <p class="settings-card__desc">{{ $t('settings.password_hint') }}</p>

          <p v-if="passwordError" class="form-message form-message--error" role="alert">
            {{ passwordError }}
          </p>
          <p v-if="passwordSent" class="form-message form-message--success" role="status">
            {{ $t('auth.reset_password_sent') }}
          </p>

          <NeumoButton
            variant="secondary"
            size="md"
            type="button"
            :disabled="auth.loading.value || passwordSent"
            @click="handlePasswordReset"
          >
            {{ auth.loading.value ? $t('common.loading') : $t('settings.send_password_reset') }}
          </NeumoButton>

          <NuxtLink to="/auth/reset-password" class="settings-link">
            {{ $t('settings.reset_password_other_email') }}
          </NuxtLink>
        </NeumoCard>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings-container {
  max-width: 720px;
}

.page-header {
  margin-bottom: 32px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-card {
  padding: 32px;
}

.settings-card__title {
  margin: 0 0 20px;
  font-size: 1.15rem;
}

.settings-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 12px;
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

.field-input--readonly {
  opacity: 0.7;
  cursor: not-allowed;
}

.field-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-size: 0.82rem;
  font-weight: 600;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toggle__track {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-inset-sm);
  transition: background 0.2s;
}

.toggle__track::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-text-muted);
  content: '';
  transition: transform 0.2s, background 0.2s;
}

.toggle__input:checked + .toggle__track {
  background: var(--color-accent-dim);
}

.toggle__input:checked + .toggle__track::after {
  transform: translateX(20px);
  background: var(--color-accent);
}

.toggle__input:focus-visible + .toggle__track {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.toggle__label {
  font-size: 0.9rem;
  font-weight: 500;
}

.form-message {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
}

.form-message--error {
  background: rgb(255 92 122 / 12%);
  color: var(--color-danger);
}

.form-message--success {
  background: rgb(32 201 151 / 12%);
  color: var(--color-accent);
}

.settings-link {
  display: inline-block;
  margin-top: 16px;
  color: var(--color-accent);
  font-size: 0.88rem;
  text-decoration: none;
}

.settings-link:hover {
  text-decoration: underline;
}
</style>
