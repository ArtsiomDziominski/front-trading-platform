<script setup lang="ts">
import type { TelegramLinkCode, TelegramNotificationItem } from '#shared/types/user-settings'

const { t } = useI18n()
const config = useRuntimeConfig()
const userSettings = useUserSettings()

const masterEnabled = ref(false)
const notificationItems = ref<TelegramNotificationItem[]>([])
const telegramError = ref('')
const telegramSuccess = ref('')

const linkCode = ref<TelegramLinkCode | null>(null)
const linkCodeCopied = ref(false)

const testMessage = ref('')
const testMessageSent = ref(false)

const botUsername = computed(() => {
  return (
    linkCode.value?.bot_username?.trim()
    || config.public.telegramBotUsername?.trim()
    || ''
  )
})

const telegramLinked = computed(() => userSettings.settings.value?.telegram_linked ?? false)

const linkCodeValue = computed(() => linkCode.value?.code ?? linkCode.value?.link_code ?? '')

const botDeepLink = computed(() => {
  if (!botUsername.value || !linkCodeValue.value) return ''
  return `https://t.me/${botUsername.value}?start=${encodeURIComponent(linkCodeValue.value)}`
})

const linkCodeExpiresLabel = computed(() => {
  const expiresAt = linkCode.value?.expires_at
  if (!expiresAt) return ''

  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
})

function syncFromSettings() {
  const s = userSettings.settings.value
  if (!s) return

  masterEnabled.value = s.telegram_notifications_enabled
  notificationItems.value = s.telegram_notifications.map(item => ({ ...item }))
}

watch(() => userSettings.settings.value, syncFromSettings, { immediate: true })

async function handleSaveTelegram() {
  telegramError.value = ''
  telegramSuccess.value = ''
  testMessageSent.value = false

  try {
    await userSettings.updateSettings({
      telegram_notifications_enabled: masterEnabled.value,
      telegram_notification_prefs: userSettings.buildPrefsUpdate(notificationItems.value),
    })
    telegramSuccess.value = t('settings.telegram_saved')
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function handleRefreshStatus() {
  telegramError.value = ''
  telegramSuccess.value = ''

  try {
    await userSettings.fetchSettings()
    if (userSettings.settings.value?.telegram_linked) {
      telegramSuccess.value = t('settings.telegram_linked')
    }
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function handleRequestLinkCode() {
  telegramError.value = ''
  linkCodeCopied.value = false
  linkCode.value = null

  try {
    const data = await userSettings.requestLinkCode()
    if (data) {
      linkCode.value = data
    }
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function copyLinkCode() {
  if (!linkCodeValue.value || !import.meta.client) return

  try {
    await navigator.clipboard.writeText(linkCodeValue.value)
    linkCodeCopied.value = true
  } catch {
    telegramError.value = t('settings.telegram_copy_failed')
  }
}

async function handleSendTestMessage() {
  telegramError.value = ''
  testMessageSent.value = false

  const message = testMessage.value.trim() || t('settings.telegram_test_default')
  if (!message) {
    telegramError.value = t('auth.error_required')
    return
  }

  try {
    await userSettings.sendTestMessage(message)
    testMessageSent.value = true
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}
</script>

<template>
  <UCard class="settings-card">
    <h2 class="settings-card__title">{{ $t('settings.telegram_section') }}</h2>
    <p class="settings-card__desc">{{ $t('settings.telegram_section_desc') }}</p>

    <UBadge
      class="mb-5"
      :color="telegramLinked ? 'primary' : 'warning'"
      variant="subtle"
      :label="telegramLinked ? $t('settings.telegram_linked') : $t('settings.telegram_not_linked')"
    />

    <div v-if="!telegramLinked" class="telegram-link">
      <p class="text-muted text-sm">{{ $t('settings.telegram_link_hint') }}</p>

      <div class="telegram-link__actions">
        <UButton
          color="neutral"
          variant="outline"
          :loading="userSettings.linkCodeLoading.value"
          @click="handleRequestLinkCode"
        >
          {{ $t('settings.telegram_get_link_code') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :loading="userSettings.loading.value"
          @click="handleRefreshStatus"
        >
          {{ $t('settings.telegram_check_link') }}
        </UButton>
      </div>

      <div v-if="linkCodeValue" class="link-code-box">
        <p class="link-code-box__label">{{ $t('settings.telegram_link_code') }}</p>
        <div class="link-code-box__row">
          <code class="link-code-box__code">{{ linkCodeValue }}</code>
          <UButton color="neutral" variant="outline" size="sm" @click="copyLinkCode">
            {{ linkCodeCopied ? $t('settings.telegram_copied') : $t('settings.telegram_copy') }}
          </UButton>
        </div>
        <p v-if="linkCodeExpiresLabel" class="text-muted text-sm mt-2">
          {{ $t('settings.telegram_link_expires', { date: linkCodeExpiresLabel }) }}
        </p>
        <ULink
          v-if="botDeepLink"
          :to="botDeepLink"
          target="_blank"
          class="settings-link mt-2 inline-block"
        >
          {{ $t('settings.telegram_open_bot') }}
        </ULink>
      </div>
    </div>

    <form class="settings-form flex flex-col gap-4" @submit.prevent="handleSaveTelegram">
      <UFormField :label="$t('settings.telegram_master')">
        <USwitch v-model="masterEnabled" :disabled="!telegramLinked" />
      </UFormField>

      <p v-if="!telegramLinked" class="text-muted text-sm">
        {{ $t('settings.telegram_prefs_disabled_hint') }}
      </p>

      <fieldset
        class="notification-types flex flex-col gap-3 rounded-lg p-4 bg-elevated/50"
        :disabled="!telegramLinked || !masterEnabled"
      >
        <legend class="text-muted text-sm font-semibold mb-1">
          {{ $t('settings.telegram_notification_types') }}
        </legend>

        <UFormField
          v-for="item in notificationItems"
          :key="item.id"
          :label="item.label"
        >
          <USwitch v-model="item.enabled" />
        </UFormField>
      </fieldset>

      <UAlert v-if="telegramError" color="error" variant="subtle" :title="telegramError" />
      <UAlert v-if="telegramSuccess" color="success" variant="subtle" :title="telegramSuccess" />

      <UButton
        type="submit"
        :disabled="!telegramLinked"
        :loading="userSettings.loading.value"
      >
        {{ $t('settings.telegram_save') }}
      </UButton>
    </form>

    <div v-if="telegramLinked" class="telegram-test">
      <h3 class="telegram-test__title">{{ $t('settings.telegram_test_title') }}</h3>
      <p class="text-muted text-sm">{{ $t('settings.telegram_test_hint') }}</p>

      <UFormField :label="$t('settings.telegram_test_message')">
        <UTextarea
          id="telegram-test-message"
          v-model="testMessage"
          :rows="3"
          maxlength="4096"
          :placeholder="$t('settings.telegram_test_default')"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="testMessageSent"
        color="success"
        variant="subtle"
        :title="$t('settings.telegram_test_sent')"
      />

      <UButton
        color="neutral"
        variant="outline"
        :loading="userSettings.loading.value"
        @click="handleSendTestMessage"
      >
        {{ $t('settings.telegram_test_send') }}
      </UButton>
    </div>
  </UCard>
</template>

<style scoped>
.settings-card {
  padding: 32px;
}

.settings-card__title {
  margin: 0 0 12px;
  font-size: 1.15rem;
}

.settings-card__desc {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.telegram-link {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.telegram-link__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.link-code-box {
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.link-code-box__label {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.link-code-box__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.link-code-box__code {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-accent);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.notification-types:disabled {
  opacity: 0.55;
}

.telegram-test {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.telegram-test__title {
  margin: 0;
  font-size: 0.95rem;
}

.settings-link {
  color: var(--color-accent);
  font-size: 0.88rem;
}
</style>
