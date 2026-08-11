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
const botQrDataUrl = ref('')

const testMessageSent = ref(false)

function normalizeBotUsername(value?: string | null) {
  return value?.trim().replace(/^@/, '') || ''
}

const botUsername = computed(() => {
  return (
    normalizeBotUsername(config.public.telegramBotUsername)
    || normalizeBotUsername(linkCode.value?.bot_username)
  )
})

const telegramLinked = computed(() => userSettings.settings.value?.telegram_linked ?? false)

const linkCodeValue = computed(() => linkCode.value?.code ?? linkCode.value?.link_code ?? '')

const botProfileLink = computed(() => {
  if (!botUsername.value) return ''
  return `https://t.me/${botUsername.value}`
})

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

watch(botDeepLink, async (link) => {
  if (!import.meta.client || !link) {
    botQrDataUrl.value = ''
    return
  }

  try {
    const { default: QRCode } = await import('qrcode')
    botQrDataUrl.value = await QRCode.toDataURL(link, {
      width: 176,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#013330',
        light: '#ffffff',
      },
    })
  } catch {
    botQrDataUrl.value = ''
  }
}, { immediate: true })

function openBotDeepLink() {
  if (!botDeepLink.value || !import.meta.client) return
  window.open(botDeepLink.value, '_blank', 'noopener,noreferrer')
}

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
    if (!data) return

    linkCode.value = data

    const code = data.code ?? data.link_code ?? ''
    const username = botUsername.value || normalizeBotUsername(data.bot_username)
    if (username && code && import.meta.client) {
      window.open(
        `https://t.me/${username}?start=${encodeURIComponent(code)}`,
        '_blank',
        'noopener,noreferrer',
      )
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

  try {
    await userSettings.sendTestMessage(t('settings.telegram_test_default'))
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

      <div v-if="botProfileLink" class="telegram-bot-link">
        <span class="telegram-bot-link__label">{{ $t('settings.telegram_bot_label') }}</span>
        <ULink
          :to="botProfileLink"
          target="_blank"
          rel="noopener noreferrer"
          class="settings-link"
        >
          @{{ botUsername }}
        </ULink>
      </div>

      <div class="telegram-link__actions">
        <AppButton
          variant="secondary"
          :loading="userSettings.linkCodeLoading.value"
          @click="handleRequestLinkCode"
        >
          {{ $t('settings.telegram_get_link_code') }}
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          :loading="userSettings.loading.value"
          @click="handleRefreshStatus"
        >
          {{ $t('settings.telegram_check_link') }}
        </AppButton>
      </div>

      <div v-if="linkCodeValue" class="link-code-box">
        <p class="link-code-box__label">{{ $t('settings.telegram_link_code') }}</p>
        <div class="link-code-box__row">
          <code class="link-code-box__code">{{ linkCodeValue }}</code>
          <AppButton variant="secondary" size="sm" @click="copyLinkCode">
            {{ linkCodeCopied ? $t('settings.telegram_copied') : $t('settings.telegram_copy') }}
          </AppButton>
        </div>
        <p v-if="linkCodeExpiresLabel" class="text-muted text-sm mt-2">
          {{ $t('settings.telegram_link_expires', { date: linkCodeExpiresLabel }) }}
        </p>

        <div v-if="botDeepLink" class="bot-open">
          <AppButton class="bot-open__button" @click="openBotDeepLink">
            {{ $t('settings.telegram_open_bot') }}
          </AppButton>

          <div v-if="botQrDataUrl" class="bot-qr">
            <img
              :src="botQrDataUrl"
              :alt="$t('settings.telegram_qr_alt')"
              class="bot-qr__image"
              width="176"
              height="176"
            >
            <p class="bot-qr__hint">{{ $t('settings.telegram_qr_hint') }}</p>
          </div>
        </div>
      </div>
    </div>

    <form class="settings-form flex flex-col gap-4" @submit.prevent="handleSaveTelegram">
      <UFormField :label="$t('settings.telegram_master')">
        <USwitch v-model="masterEnabled" :disabled="!telegramLinked" />
      </UFormField>

      <p v-if="!telegramLinked" class="text-muted text-sm">
        {{ $t('settings.telegram_prefs_disabled_hint') }}
      </p>

      <div
        class="notification-types flex flex-col gap-3"
        :class="{ 'notification-types--disabled': !telegramLinked || !masterEnabled }"
      >
        <p class="text-muted text-sm font-semibold mb-1">
          {{ $t('settings.telegram_notification_types') }}
        </p>

        <UFormField
          v-for="item in notificationItems"
          :key="item.id"
          :label="item.label"
        >
          <USwitch
            v-model="item.enabled"
            :disabled="!telegramLinked || !masterEnabled"
          />
        </UFormField>
      </div>

      <UAlert v-if="telegramError" color="error" variant="subtle" :title="telegramError" />
      <UAlert v-if="telegramSuccess" color="success" variant="subtle" :title="telegramSuccess" />

      <AppButton
        type="submit"
        :disabled="!telegramLinked"
        :loading="userSettings.loading.value"
      >
        {{ $t('settings.telegram_save') }}
      </AppButton>
    </form>

    <div v-if="telegramLinked" class="telegram-test">
      <h3 class="telegram-test__title">{{ $t('settings.telegram_test_title') }}</h3>
      <p class="text-muted text-sm">{{ $t('settings.telegram_test_hint') }}</p>

      <UAlert
        v-if="testMessageSent"
        color="success"
        variant="subtle"
        :title="$t('settings.telegram_test_sent')"
      />

      <AppButton
        :loading="userSettings.loading.value"
        @click="handleSendTestMessage"
      >
        {{ $t('settings.telegram_test_send') }}
      </AppButton>
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

.telegram-bot-link {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.telegram-bot-link__label {
  color: var(--color-text-muted);
  font-size: 0.88rem;
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

.bot-open {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.bot-open__button {
  align-self: flex-start;
}

.bot-qr {
  display: none;
  width: fit-content;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.bot-qr__image {
  display: block;
  width: 176px;
  height: 176px;
}

.bot-qr__hint {
  margin: 10px 0 0;
  max-width: 176px;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .bot-qr {
    display: block;
  }
}

.notification-types--disabled {
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
