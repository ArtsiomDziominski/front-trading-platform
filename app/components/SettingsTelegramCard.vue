<script setup lang="ts">
import type {
  TelegramLinkCode,
  TelegramNotificationId,
  TelegramNotificationItem,
} from '#shared/types/user-settings'

const LINK_POLL_INTERVAL_MS = 3000
const LINK_POLL_TIMEOUT_MS = 3 * 60 * 1000

const { t } = useI18n()
const config = useRuntimeConfig()
const userSettings = useUserSettings()

const masterEnabled = ref(false)
const notificationItems = ref<TelegramNotificationItem[]>([])
const profitAlertPercent = ref('')
const profitAlertUsd = ref('')
const telegramError = ref('')
const telegramSuccess = ref('')

const linkCode = ref<TelegramLinkCode | null>(null)
const linkCodeCopied = ref(false)
const botQrDataUrl = ref('')
const unlinkConfirmOpen = ref(false)
const linkPolling = ref(false)

const testMessageSent = ref(false)

let linkPollTimer: ReturnType<typeof setInterval> | null = null
let linkPollDeadline = 0

function normalizeBotUsername(value?: string | null) {
  return value?.trim().replace(/^@/, '') || ''
}

function formatThreshold(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseThresholdInput(raw: string | number | null | undefined): { value: number | null, hasInvalid: boolean } {
  const trimmed = String(raw ?? '').trim().replace(',', '.')
  if (!trimmed) return { value: null, hasInvalid: false }

  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return { value: null, hasInvalid: true }
  if (n === 0) return { value: null, hasInvalid: false }
  return { value: n, hasInvalid: false }
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

const profitAlertEnabled = computed(() => {
  return notificationItems.value.find(item => item.id === 'profit_alert')?.enabled ?? false
})

const hasPrefsDisabled = computed(() => !telegramLinked.value || !masterEnabled.value)

const hasThresholdsDisabled = computed(() => {
  return hasPrefsDisabled.value || !profitAlertEnabled.value
})

watch(botProfileLink, async (link) => {
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

function openBotProfile() {
  if (!botProfileLink.value || !import.meta.client) return
  window.open(botProfileLink.value, '_blank', 'noopener,noreferrer')
}

function syncFromSettings() {
  const s = userSettings.settings.value
  if (!s) return

  masterEnabled.value = s.telegram_notifications_enabled
  notificationItems.value = s.telegram_notifications.map(item => ({ ...item }))
  profitAlertPercent.value = formatThreshold(s.telegram_profit_alert_percent)
  profitAlertUsd.value = formatThreshold(s.telegram_profit_alert_usd)
}

function stopLinkPolling() {
  if (linkPollTimer) {
    clearInterval(linkPollTimer)
    linkPollTimer = null
  }
  linkPolling.value = false
}

async function pollLinkStatus() {
  if (Date.now() >= linkPollDeadline) {
    stopLinkPolling()
    return
  }

  try {
    await userSettings.fetchSettings()
    if (userSettings.settings.value?.telegram_linked) {
      stopLinkPolling()
      telegramSuccess.value = t('settings.telegram_linked')
    }
  } catch {
    // keep polling until timeout; surface last error only on manual refresh
  }
}

function startLinkPolling() {
  stopLinkPolling()
  if (!import.meta.client) return

  linkPolling.value = true
  linkPollDeadline = Date.now() + LINK_POLL_TIMEOUT_MS
  void pollLinkStatus()
  linkPollTimer = setInterval(() => {
    void pollLinkStatus()
  }, LINK_POLL_INTERVAL_MS)
}

watch(() => userSettings.settings.value, syncFromSettings, { immediate: true })

watch(telegramLinked, (linked) => {
  if (linked) {
    linkCode.value = null
    linkCodeCopied.value = false
    stopLinkPolling()
  }
})

onBeforeUnmount(() => {
  stopLinkPolling()
})

async function handleSaveTelegram() {
  telegramError.value = ''
  telegramSuccess.value = ''
  testMessageSent.value = false

  const percent = parseThresholdInput(profitAlertPercent.value)
  const usd = parseThresholdInput(profitAlertUsd.value)

  if (percent.hasInvalid || usd.hasInvalid) {
    telegramError.value = t('settings.telegram_profit_alert_invalid')
    return
  }

  try {
    await userSettings.updateSettings({
      telegram_notifications_enabled: masterEnabled.value,
      telegram_notification_prefs: userSettings.buildPrefsUpdate(notificationItems.value),
      telegram_profit_alert_percent: percent.value,
      telegram_profit_alert_usd: usd.value,
    })
    telegramSuccess.value = t('settings.telegram_saved')
  } catch {
    syncFromSettings()
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function handleRefreshStatus() {
  telegramError.value = ''
  telegramSuccess.value = ''

  try {
    await userSettings.fetchSettings()
    if (userSettings.settings.value?.telegram_linked) {
      stopLinkPolling()
      telegramSuccess.value = t('settings.telegram_linked')
    }
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function handleRequestLinkCode() {
  telegramError.value = ''
  telegramSuccess.value = ''
  linkCodeCopied.value = false
  linkCode.value = null

  try {
    const data = await userSettings.requestLinkCode()
    if (!data) return

    linkCode.value = data
    startLinkPolling()
  } catch {
    telegramError.value = userSettings.error.value || t('auth.error_unknown')
  }
}

async function handleUnlinkConfirm() {
  telegramError.value = ''
  telegramSuccess.value = ''
  testMessageSent.value = false

  try {
    await userSettings.unlinkTelegram()
    unlinkConfirmOpen.value = false
    linkCode.value = null
    linkCodeCopied.value = false
    stopLinkPolling()
    telegramSuccess.value = t('settings.telegram_unlinked')
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

function isProfitAlertItem(id: TelegramNotificationId) {
  return id === 'profit_alert'
}
</script>

<template>
  <UCard class="settings-card">
    <h2 class="settings-card__title">{{ $t('settings.telegram_section') }}</h2>
    <p class="settings-card__desc">{{ $t('settings.telegram_section_desc') }}</p>

    <div class="telegram-status">
      <UBadge
        :color="telegramLinked ? 'primary' : 'warning'"
        variant="subtle"
        :label="telegramLinked ? $t('settings.telegram_linked') : $t('settings.telegram_not_linked')"
      />
      <UButton
        v-if="telegramLinked"
        class="telegram-unlink"
        color="error"
        variant="solid"
        size="sm"
        :loading="userSettings.unlinkLoading.value"
        @click="() => { unlinkConfirmOpen = true }"
      >
        {{ $t('settings.telegram_unlink') }}
      </UButton>
    </div>

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

      <p v-if="linkPolling" class="text-muted text-sm">
        {{ $t('settings.telegram_link_polling') }}
      </p>

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

        <div v-if="botProfileLink" class="bot-open">
          <AppButton class="bot-open__button" @click="openBotProfile">
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
        :class="{ 'notification-types--disabled': hasPrefsDisabled }"
      >
        <p class="text-muted text-sm font-semibold mb-1">
          {{ $t('settings.telegram_notification_types') }}
        </p>

        <div
          v-for="item in notificationItems"
          :key="item.id"
          class="notification-item"
        >
          <UFormField :label="item.label">
            <USwitch
              v-model="item.enabled"
              :disabled="hasPrefsDisabled"
            />
          </UFormField>

          <div
            v-if="isProfitAlertItem(item.id)"
            class="profit-alert-thresholds"
            :class="{ 'profit-alert-thresholds--disabled': hasThresholdsDisabled }"
          >
            <p class="text-muted text-sm">
              {{ $t('settings.telegram_profit_alert_hint') }}
            </p>

            <div class="profit-alert-thresholds__row">
              <UFormField :label="$t('settings.telegram_profit_alert_percent')" class="flex-1">
                <UInput
                  v-model="profitAlertPercent"
                  inputmode="decimal"
                  :placeholder="$t('settings.telegram_profit_alert_off')"
                  :disabled="hasThresholdsDisabled"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('settings.telegram_profit_alert_usd')" class="flex-1">
                <UInput
                  v-model="profitAlertUsd"
                  inputmode="decimal"
                  :placeholder="$t('settings.telegram_profit_alert_off')"
                  :disabled="hasThresholdsDisabled"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>
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

    <ConfirmModal
      v-model="unlinkConfirmOpen"
      :title="$t('settings.telegram_unlink_title')"
      :message="$t('settings.telegram_unlink_confirm')"
      :confirm-label="$t('settings.telegram_unlink')"
      :cancel-label="$t('common.cancel')"
      :loading-label="$t('common.loading')"
      :loading="userSettings.unlinkLoading.value"
      confirm-variant="danger"
      @confirm="handleUnlinkConfirm"
    />
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

.telegram-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

.telegram-unlink {
  margin-left: auto;
  color: #fff !important;
  background: #dc2626 !important;
  --tw-ring-color: transparent !important;
}

.telegram-unlink:hover {
  background: #b91c1c !important;
}

.telegram-link {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
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

.notification-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profit-alert-thresholds {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.profit-alert-thresholds--disabled {
  opacity: 0.55;
}

.profit-alert-thresholds__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
