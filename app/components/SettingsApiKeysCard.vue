<script setup lang="ts">
import type { ApiKeyOut, ExchangeType } from '#shared/types/api-key'

const { t } = useI18n()
const apiKeys = useApiKeys()

const addModalOpen = ref(false)
const formSuccess = ref(false)
const deleteConfirmOpen = ref(false)
const keyToDelete = ref<ApiKeyOut | null>(null)

const exchange = ref<ExchangeType>('BINANCE')
const label = ref('')
const apiKey = ref('')
const apiSecret = ref('')

const exchangeOptions: ExchangeType[] = ['BINANCE', 'BYBIT', 'OKX', 'OTHER']

const route = useRoute()
const sectionRef = ref<HTMLElement | null>(null)

const exchangeSelectItems = computed(() =>
  exchangeOptions.map((opt) => ({
    label: formatExchange(opt),
    value: opt,
  })),
)

function scrollIntoViewIfTargeted() {
  if (route.hash !== '#api-keys') return

  nextTick(() => {
    sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function formatExchange(value: ExchangeType): string {
  if (value === 'OTHER') return t('settings.api_keys_exchange_other')
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function resetForm() {
  exchange.value = 'BINANCE'
  label.value = ''
  apiKey.value = ''
  apiSecret.value = ''
}

function openAddModal() {
  formSuccess.value = false
  apiKeys.error.value = null
  resetForm()
  addModalOpen.value = true
}

function closeAddModal() {
  if (apiKeys.creating.value) return
  addModalOpen.value = false
  apiKeys.error.value = null
  resetForm()
}

function openDeleteConfirm(key: ApiKeyOut) {
  keyToDelete.value = key
  deleteConfirmOpen.value = true
}

async function handleDeleteConfirm() {
  if (!keyToDelete.value) return

  formSuccess.value = false
  try {
    await apiKeys.deleteKey(keyToDelete.value.id)
    deleteConfirmOpen.value = false
    keyToDelete.value = null
  } catch {
    // error in apiKeys.error
  }
}

async function handleCreateSubmit() {
  formSuccess.value = false

  const trimmedKey = apiKey.value.trim()
  const trimmedSecret = apiSecret.value.trim()
  if (!trimmedKey || !trimmedSecret) {
    apiKeys.error.value = t('settings.api_keys_error_required')
    return
  }

  try {
    await apiKeys.createKey({
      exchange: exchange.value,
      api_key: trimmedKey,
      api_secret: trimmedSecret,
      label: label.value.trim() || undefined,
    })
    formSuccess.value = true
    addModalOpen.value = false
    resetForm()
    apiKeys.error.value = null
  } catch {
    // error in apiKeys.error
  }
}

onMounted(async () => {
  await apiKeys.fetchKeys()
  scrollIntoViewIfTargeted()
})

watch(() => route.hash, scrollIntoViewIfTargeted)
</script>

<template>
  <div id="api-keys" ref="sectionRef" class="api-keys-section">
    <UCard class="settings-card">
      <h2 class="settings-card__title">{{ $t('settings.api_keys_section') }}</h2>
      <p class="settings-card__desc">{{ $t('settings.api_keys_section_desc') }}</p>

      <UAlert
        v-if="formSuccess"
        color="success"
        variant="subtle"
        :title="$t('settings.api_keys_added_success')"
        class="mb-4"
      />

      <div v-if="apiKeys.loading.value && !apiKeys.keys.value.length" class="api-keys-loading">
        {{ $t('common.loading') }}
      </div>

      <ul v-else-if="apiKeys.keys.value.length" class="api-keys-list">
        <li v-for="key in apiKeys.keys.value" :key="key.id" class="api-keys-list__item">
          <div class="api-keys-list__main">
            <p class="api-keys-list__title">
              {{ formatExchange(key.exchange) }}
              <span v-if="key.label" class="api-keys-list__label">— {{ key.label }}</span>
            </p>
            <p class="api-keys-list__masked">{{ key.api_key_masked }}</p>
            <p class="api-keys-list__meta">
              {{ $t('settings.api_keys_added', { date: formatCreatedAt(key.created_at) }) }}
            </p>
          </div>
          <UButton
            color="error"
            size="sm"
            :loading="apiKeys.deletingId.value === key.id"
            @click="openDeleteConfirm(key)"
          >
            {{ $t('settings.api_keys_delete') }}
          </UButton>
        </li>
      </ul>

      <p v-else class="api-keys-empty">{{ $t('settings.api_keys_empty') }}</p>

      <UButton class="mt-2" @click="openAddModal">
        {{ $t('settings.api_keys_add') }}
      </UButton>

      <UModal
        v-model:open="addModalOpen"
        :title="$t('settings.api_keys_add_title')"
        :dismissible="!apiKeys.creating.value"
        scrollable
        :ui="{ footer: 'justify-end gap-2' }"
      >
        <template #body>
          <form class="api-keys-form flex flex-col gap-4" @submit.prevent="handleCreateSubmit">
            <UFormField :label="$t('settings.api_keys_exchange')">
              <USelect
                v-model="exchange"
                :items="exchangeSelectItems"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.api_keys_label')">
              <UInput
                v-model="label"
                maxlength="128"
                :placeholder="$t('settings.api_keys_label_placeholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.api_keys_key')">
              <UInput
                v-model="apiKey"
                maxlength="512"
                autocomplete="off"
                :placeholder="$t('settings.api_keys_key_placeholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.api_keys_secret')">
              <UInput
                v-model="apiSecret"
                type="password"
                maxlength="512"
                autocomplete="new-password"
                :placeholder="$t('settings.api_keys_secret_placeholder')"
                class="w-full"
              />
              <template #hint>
                {{ $t('settings.api_keys_secret_hint') }}
              </template>
            </UFormField>

            <UAlert
              v-if="apiKeys.error.value"
              color="error"
              variant="subtle"
              :title="apiKeys.error.value"
            />
          </form>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="apiKeys.creating.value"
            @click="closeAddModal"
          >
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            size="sm"
            :loading="apiKeys.creating.value"
            @click="handleCreateSubmit"
          >
            {{ $t('settings.api_keys_save') }}
          </UButton>
        </template>
      </UModal>

      <ConfirmModal
        v-model="deleteConfirmOpen"
        :title="$t('settings.api_keys_delete_title')"
        :message="
          keyToDelete
            ? $t('settings.api_keys_delete_confirm', {
              exchange: formatExchange(keyToDelete.exchange),
              label: keyToDelete.label || keyToDelete.api_key_masked,
            })
            : ''
        "
        :confirm-label="$t('settings.api_keys_delete')"
        :cancel-label="$t('common.cancel')"
        :loading-label="$t('common.loading')"
        :loading="apiKeys.deletingId.value !== null"
        confirm-variant="danger"
        @confirm="handleDeleteConfirm"
      />
    </UCard>
  </div>
</template>

<style scoped>
.api-keys-section {
  scroll-margin-top: 88px;
}

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

.api-keys-loading,
.api-keys-empty {
  margin: 0 0 20px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.api-keys-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
}

.api-keys-list__item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
}

.api-keys-list__main {
  flex: 1;
  min-width: 0;
}

.api-keys-list__title {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 600;
}

.api-keys-list__label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.api-keys-list__masked {
  margin: 0 0 4px;
  font-family: ui-monospace, monospace;
  font-size: 0.88rem;
  color: var(--color-accent);
}

.api-keys-list__meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}
</style>
