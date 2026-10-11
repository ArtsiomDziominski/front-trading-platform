<script setup lang="ts">
import type { ApiKeyOut } from '#shared/types/api-key'

defineProps<{
  apiKeys: ApiKeyOut[]
  showCloneNotice?: boolean
  creating: boolean
  formError: string
  engineWarning: string
  createdBotId: number | null
}>()

const emit = defineEmits<{
  submit: []
}>()

const apiKeyId = defineModel<number | ''>('apiKeyId', { required: true })
const symbol = defineModel<string>('symbol', { required: true })

const formRef = ref<HTMLElement | null>(null)

const apiKeyIdModel = computed({
  get: (): number | undefined => (apiKeyId.value === '' ? undefined : apiKeyId.value),
  set: (value: number | undefined) => {
    apiKeyId.value = value ?? ''
  },
})

function formatExchange(exchange: ApiKeyOut['exchange']): string {
  if (exchange === 'OTHER') return 'Other'
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}

function apiKeyLabel(key: ApiKeyOut): string {
  return `${formatExchange(key.exchange)} — ${key.label} (${key.api_key_masked})`
}

function scrollIntoView() {
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ scrollIntoView })
</script>

<template>
  <UCard class="create-form-card">
    <div ref="formRef">
      <p v-if="showCloneNotice" class="clone-notice" role="status">
        {{ $t('bots.creation_history_cloned') }}
      </p>

      <form class="create-form flex flex-col gap-4" @submit.prevent="emit('submit')">
        <UFormField :label="$t('bots.field_api_key')">
          <USelect
            id="bot-api-key"
            v-model="apiKeyIdModel"
            :items="apiKeys.map((key) => ({ label: apiKeyLabel(key), value: key.id }))"
            placeholder="—"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('bots.field_symbol')">
          <UInput
            id="bot-symbol"
            v-model="symbol"
            :placeholder="$t('bots.field_symbol_hint')"
            autocomplete="off"
            required
            class="w-full"
          />
          <template #hint>
            {{ $t('bots.field_symbol_hint') }}
          </template>
        </UFormField>

        <slot />

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
        <UAlert v-if="engineWarning" color="warning" variant="subtle" :title="engineWarning" />

        <div class="form-actions flex flex-wrap gap-2">
          <AppButton type="submit" :loading="creating">
            {{ $t('bots.create_submit') }}
          </AppButton>
          <AppButton
            v-if="createdBotId"
            variant="secondary"
            to="/bots"
          >
            {{ $t('bots.back_to_bots') }}
          </AppButton>
        </div>
      </form>
    </div>
  </UCard>
</template>

<style scoped>
.create-form-card {
  padding: 32px;
}

.clone-notice {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
  font-size: 0.85rem;
  font-weight: 600;
}

@media (max-width: 640px) {
  .create-form-card {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions > * {
    width: 100%;
  }

  .form-actions :deep(button),
  .form-actions :deep(a) {
    width: 100%;
    justify-content: center;
    min-height: 44px;
  }
}
</style>
