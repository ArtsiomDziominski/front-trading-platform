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
        <UCard class="settings-card">
          <h2 class="settings-card__title">{{ $t('settings.profile_section') }}</h2>

          <form class="settings-form" @submit.prevent="handleProfileSubmit">
            <UFormField :label="$t('auth.name')">
              <UInput
                id="settings-name"
                v-model="name"
                type="text"
                :placeholder="$t('auth.name')"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('auth.email')">
              <UInput
                id="settings-email"
                :model-value="auth.user.value?.email ?? ''"
                type="email"
                disabled
                class="w-full"
              />
              <template #hint>
                {{ $t('settings.email_readonly_hint') }}
              </template>
            </UFormField>

            <UFormField v-if="auth.user.value" :label="$t('settings.role')">
              <UBadge
                color="primary"
                variant="subtle"
                :label="$t(roleLabels[auth.user.value.role] ?? 'settings.role_user')"
              />
            </UFormField>

            <UAlert v-if="profileError" color="error" variant="subtle" :title="profileError" />
            <UAlert
              v-if="profileSuccess"
              color="success"
              variant="subtle"
              :title="$t('settings.profile_saved')"
            />

            <UButton type="submit" :loading="auth.loading.value">
              {{ $t('settings.save_profile') }}
            </UButton>
          </form>
        </UCard>

        <SettingsApiKeysCard />

        <SettingsTelegramCard />

        <UCard class="settings-card">
          <h2 class="settings-card__title">{{ $t('settings.security_section') }}</h2>
          <p class="settings-card__desc">{{ $t('settings.password_hint') }}</p>

          <UAlert v-if="passwordError" color="error" variant="subtle" :title="passwordError" />
          <UAlert
            v-if="passwordSent"
            color="success"
            variant="subtle"
            :title="$t('auth.reset_password_sent')"
          />

          <UButton
            color="neutral"
            variant="outline"
            type="button"
            :disabled="auth.loading.value || passwordSent"
            :loading="auth.loading.value"
            @click="handlePasswordReset"
          >
            {{ $t('settings.send_password_reset') }}
          </UButton>

          <NuxtLink to="/auth/reset-password" class="settings-link">
            {{ $t('settings.reset_password_other_email') }}
          </NuxtLink>
        </UCard>
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
