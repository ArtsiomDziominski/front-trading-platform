<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const actionItems = [
  { titleKey: 'bots.action_stop', textKey: 'bots.help_action_stop' },
  { titleKey: 'bots.action_close', textKey: 'bots.help_action_close' },
  { titleKey: 'bots.action_redeploy', textKey: 'bots.help_action_redeploy' },
  { titleKey: 'bots.take_profit_edit', textKey: 'bots.help_action_take_profit' },
  { titleKey: 'bots.action_remove', textKey: 'bots.help_action_remove' },
] as const

const createSteps = [
  { titleKey: 'bots.help_create_step_1_title', textKey: 'bots.help_create_step_1' },
  { titleKey: 'bots.help_create_step_2_title', textKey: 'bots.help_create_step_2' },
  { titleKey: 'bots.help_create_step_3_title', textKey: 'bots.help_create_step_3' },
  { titleKey: 'bots.help_create_step_4_title', textKey: 'bots.help_create_step_4' },
] as const
</script>

<template>
  <AppModal
    v-model:open="open"
    :title="$t('bots.help_title')"
    :description="$t('bots.help_description')"
    scrollable
  >
    <template #body>
      <div class="bots-help">
        <section class="bots-help__section">
          <h3 class="bots-help__heading">{{ $t('bots.help_actions_title') }}</h3>
          <ul class="bots-help__list">
            <li v-for="item in actionItems" :key="item.titleKey" class="bots-help__item">
              <strong>{{ $t(item.titleKey) }}</strong>
              <span>{{ $t(item.textKey) }}</span>
            </li>
          </ul>
        </section>

        <section class="bots-help__section">
          <h3 class="bots-help__heading">{{ $t('bots.help_create_title') }}</h3>
          <ol class="bots-help__steps">
            <li v-for="(step, index) in createSteps" :key="step.titleKey" class="bots-help__step">
              <span class="bots-help__step-index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="bots-help__step-body">
                <strong>{{ $t(step.titleKey) }}</strong>
                <span>{{ $t(step.textKey) }}</span>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.bots-help {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.bots-help__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bots-help__heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.bots-help__list,
.bots-help__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bots-help__item,
.bots-help__step-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bots-help__item strong,
.bots-help__step-body strong {
  font-size: 0.88rem;
  font-weight: 600;
}

.bots-help__item span,
.bots-help__step-body span {
  color: var(--color-text-muted);
  font-size: 0.84rem;
  line-height: 1.45;
}

.bots-help__step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.bots-help__step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  font-size: 0.75rem;
  font-weight: 700;
}
</style>
