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
  <NeumoCard variant="raised" class="settings-card">
    <h2 class="settings-card__title">{{ $t('settings.telegram_section') }}</h2>
    <p class="settings-card__desc">{{ $t('settings.telegram_section_desc') }}</p>

    <div class="telegram-status">
      <span
        class="telegram-status__badge"
        :class="telegramLinked ? 'telegram-status__badge--linked' : 'telegram-status__badge--unlinked'"
      >
        {{
          telegramLinked
            ? $t('settings.telegram_linked')
            : $t('settings.telegram_not_linked')
        }}
      </span>
    </div>

    <div v-if="!telegramLinked" class="telegram-link">
      <p class="field-hint">{{ $t('settings.telegram_link_hint') }}</p>

      <div class="telegram-link__actions">
        <NeumoButton
          variant="secondary"
          size="md"
          type="button"
          :disabled="userSettings.linkCodeLoading.value"
          @click="handleRequestLinkCode"
        >
          {{
            userSettings.linkCodeLoading.value
              ? $t('common.loading')
              : $t('settings.telegram_get_link_code')
          }}
        </NeumoButton>
        <NeumoButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="userSettings.loading.value"
          @click="handleRefreshStatus"
        >
          {{ $t('settings.telegram_check_link') }}
        </NeumoButton>
      </div>

      <div v-if="linkCodeValue" class="link-code-box">
        <p class="link-code-box__label">{{ $t('settings.telegram_link_code') }}</p>
        <div class="link-code-box__row">
          <code class="link-code-box__code">{{ linkCodeValue }}</code>
          <NeumoButton variant="secondary" size="sm" type="button" @click="copyLinkCode">
            {{ linkCodeCopied ? $t('settings.telegram_copied') : $t('settings.telegram_copy') }}
          </NeumoButton>
        </div>
        <p v-if="linkCodeExpiresLabel" class="field-hint">
          {{ $t('settings.telegram_link_expires', { date: linkCodeExpiresLabel }) }}
        </p>
        <a
          v-if="botDeepLink"
          :href="botDeepLink"
          target="_blank"
          rel="noopener noreferrer"
          class="settings-link"
        >
          {{ $t('settings.telegram_open_bot') }}
        </a>
      </div>
    </div>

    <form class="settings-form telegram-form" @submit.prevent="handleSaveTelegram">
      <label class="toggle">
        <input
          v-model="masterEnabled"
          type="checkbox"
          class="toggle__input"
          :disabled="!telegramLinked"
        />
        <span class="toggle__track" aria-hidden="true" />
        <span class="toggle__label">{{ $t('settings.telegram_master') }}</span>
      </label>

      <p v-if="!telegramLinked" class="field-hint">
        {{ $t('settings.telegram_prefs_disabled_hint') }}
      </p>

      <fieldset class="notification-types" :disabled="!telegramLinked || !masterEnabled">
        <legend class="notification-types__legend">
          {{ $t('settings.telegram_notification_types') }}
        </legend>

        <label
          v-for="item in notificationItems"
          :key="item.id"
          class="toggle notification-types__item"
        >
          <input
            v-model="item.enabled"
            type="checkbox"
            class="toggle__input"
          />
          <span class="toggle__track" aria-hidden="true" />
          <span class="toggle__label">{{ item.label }}</span>
        </label>
      </fieldset>

      <p v-if="telegramError" class="form-message form-message--error" role="alert">
        {{ telegramError }}
      </p>
      <p v-if="telegramSuccess" class="form-message form-message--success" role="status">
        {{ telegramSuccess }}
      </p>

      <NeumoButton
        variant="primary"
        size="md"
        type="submit"
        :disabled="userSettings.loading.value || !telegramLinked"
      >
        {{ userSettings.loading.value ? $t('common.loading') : $t('settings.telegram_save') }}
      </NeumoButton>
    </form>

    <div v-if="telegramLinked" class="telegram-test">
      <h3 class="telegram-test__title">{{ $t('settings.telegram_test_title') }}</h3>
      <p class="field-hint">{{ $t('settings.telegram_test_hint') }}</p>

      <div class="field">
        <label class="field-label" for="telegram-test-message">
          {{ $t('settings.telegram_test_message') }}
        </label>
        <textarea
          id="telegram-test-message"
          v-model="testMessage"
          class="field-input field-textarea neumo-sm-inset"
          rows="3"
          maxlength="4096"
          :placeholder="$t('settings.telegram_test_default')"
        />
      </div>

      <p v-if="testMessageSent" class="form-message form-message--success" role="status">
        {{ $t('settings.telegram_test_sent') }}
      </p>

      <NeumoButton
        variant="secondary"
        size="md"
        type="button"
        :disabled="userSettings.loading.value"
        @click="handleSendTestMessage"
      >
        {{ userSettings.loading.value ? $t('common.loading') : $t('settings.telegram_test_send') }}
      </NeumoButton>
    </div>
  </NeumoCard>
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

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.telegram-status {
  margin-bottom: 20px;
}

.telegram-status__badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
}

.telegram-status__badge--linked {
  background: rgb(32 201 151 / 15%);
  color: var(--color-accent);
}

.telegram-status__badge--unlinked {
  background: rgb(240 180 41 / 12%);
  color: var(--color-warning);
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
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
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

.field-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.notification-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
}

.notification-types:disabled {
  opacity: 0.55;
}

.notification-types__legend {
  margin-bottom: 4px;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
}

.notification-types__item {
  margin: 0;
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

.field-textarea {
  resize: vertical;
  min-height: 80px;
}

.field-input:focus {
  box-shadow: var(--shadow-sm);
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

.toggle__input:disabled + .toggle__track {
  opacity: 0.5;
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
  margin-top: 8px;
  color: var(--color-accent);
  font-size: 0.88rem;
  text-decoration: none;
}

.settings-link:hover {
  text-decoration: underline;
}
</style>
