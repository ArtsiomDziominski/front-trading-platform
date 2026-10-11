<script setup lang="ts">
import type { BotEventOut } from '#shared/types/bot'

/** The bot's latest events; the full, filterable log stays on /history. */
const props = defineProps<{
  botId: number
  events: BotEventOut[]
  loading: boolean
  loaded: boolean
  error: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const PAGE = 15
const shown = ref(PAGE)
const visible = computed(() => props.events.slice(0, shown.value))

watch(() => props.botId, () => {
  shown.value = PAGE
})
</script>

<template>
  <section class="detail-panel" :aria-labelledby="`events-title-${botId}`">
    <div class="detail-panel__head">
      <h2 :id="`events-title-${botId}`" class="detail-panel__title">{{ $t('bots.detail_events') }}</h2>
      <NuxtLink :to="`/history?bot_id=${botId}`" class="detail-events__all">
        {{ $t('bots.detail_events_all') }}
      </NuxtLink>
    </div>

    <div v-if="error && !events.length" class="detail-events__state detail-events__state--error" role="alert">
      <span>{{ error }}</span>
      <AppButton variant="secondary" size="sm" @click="emit('retry')">
        {{ $t('common.retry') }}
      </AppButton>
    </div>
    <p v-else-if="!loaded && loading" class="detail-panel__empty" role="status">{{ $t('common.loading') }}</p>
    <p v-else-if="!events.length" class="detail-panel__empty">{{ $t('bots.event_history_empty') }}</p>

    <template v-else>
      <BotEventFeed :events="visible" compact />
      <AppButton
        v-if="events.length > shown"
        variant="secondary"
        size="sm"
        class="detail-events__more"
        @click="shown += PAGE"
      >
        {{ $t('bots.event_history_load_more') }}
      </AppButton>
    </template>
  </section>
</template>

<style scoped>
.detail-events__all {
  color: var(--color-accent);
  font-size: 0.85rem;
  text-decoration: none;
}

.detail-events__all:hover {
  text-decoration: underline;
}

.detail-events__state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
}

.detail-events__state--error {
  color: var(--color-danger);
}

.detail-events__more {
  align-self: center;
}
</style>
