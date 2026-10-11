<script setup lang="ts">
import { BOT_MARKETS, catalogEntriesFor, isMarketAvailable, type BotCatalogEntry, type BotMarket } from '~/utils/botCatalog'

const market = defineModel<BotMarket>('market', { required: true })
/** Slug of the chosen type inside `market`; `null` until one is picked. */
const type = defineModel<string | null>('type', { required: true })

const marketTitleId = useId()
const typeTitleId = useId()

const entries = computed(() => catalogEntriesFor(market.value))

function selectMarket(value: BotMarket) {
  if (market.value === value) return
  market.value = value
  type.value = null
}

function selectType(entry: BotCatalogEntry) {
  if (!entry.available) return
  type.value = entry.slug
}
</script>

<template>
  <div class="bot-type-picker">
    <section class="bot-type-picker__step">
      <h3 :id="marketTitleId" class="bot-type-picker__step-title">{{ $t('bots.create_step_market') }}</h3>
      <div class="bot-type-picker__markets" role="group" :aria-labelledby="marketTitleId">
        <button
          v-for="option in BOT_MARKETS"
          :key="option.value"
          type="button"
          class="bot-type-picker__option"
          :class="{ 'bot-type-picker__option--active': market === option.value }"
          :aria-pressed="market === option.value"
          @click="selectMarket(option.value)"
        >
          <UIcon :name="option.icon" class="bot-type-picker__icon" aria-hidden="true" />
          <span class="bot-type-picker__option-title">{{ $t(option.labelKey) }}</span>
          <span class="bot-type-picker__option-desc">{{ $t(option.descKey) }}</span>
          <span v-if="!isMarketAvailable(option.value)" class="bot-type-picker__soon">{{ $t('bots.catalog_soon') }}</span>
        </button>
      </div>
    </section>

    <section class="bot-type-picker__step">
      <h3 :id="typeTitleId" class="bot-type-picker__step-title">{{ $t('bots.create_step_type') }}</h3>
      <div class="bot-type-picker__types" role="group" :aria-labelledby="typeTitleId">
        <button
          v-for="entry in entries"
          :key="`${entry.market}-${entry.slug}`"
          type="button"
          class="bot-type-picker__option"
          :class="{ 'bot-type-picker__option--active': type === entry.slug }"
          :aria-pressed="type === entry.slug"
          :disabled="!entry.available"
          @click="selectType(entry)"
        >
          <UIcon :name="entry.icon" class="bot-type-picker__icon" aria-hidden="true" />
          <span class="bot-type-picker__option-title">{{ $t(entry.titleKey) }}</span>
          <span class="bot-type-picker__option-desc">{{ $t(entry.descKey) }}</span>
          <span v-if="!entry.available" class="bot-type-picker__soon">{{ $t('bots.catalog_soon') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bot-type-picker {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bot-type-picker__step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bot-type-picker__step-title {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bot-type-picker__markets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.bot-type-picker__types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}

.bot-type-picker__option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.bot-type-picker__option:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-text) 25%, transparent);
}

.bot-type-picker__option:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.bot-type-picker__option--active {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}

.bot-type-picker__option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bot-type-picker__icon {
  width: 20px;
  height: 20px;
  margin-bottom: 4px;
  color: var(--color-accent);
}

.bot-type-picker__option-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.bot-type-picker__option-desc {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

.bot-type-picker__soon {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .bot-type-picker__types {
    grid-template-columns: 1fr;
  }
}
</style>
