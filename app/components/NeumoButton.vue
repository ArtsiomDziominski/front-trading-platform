<script setup lang="ts">
import { NuxtLink } from '#components'

type ButtonTag = 'button' | 'a' | 'NuxtLink'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  tag?: ButtonTag
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  size: 'md',
  tag: 'button',
  type: 'button',
})

const resolvedTag = computed(() => (props.tag === 'NuxtLink' ? NuxtLink : props.tag))
</script>

<template>
  <component
    :is="resolvedTag"
    v-bind="$attrs"
    class="neumo-btn"
    :class="[`neumo-btn--${variant}`, `neumo-btn--${size}`]"
    :type="tag === 'button' ? type : undefined"
  >
    <slot />
  </component>
</template>

<style scoped>
.neumo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  transition: box-shadow 0.2s, transform 0.15s;
  text-decoration: none;
  white-space: nowrap;
}

.neumo-btn--sm {
  min-height: 34px;
  padding: 0 16px;
  font-size: 0.85rem;
}

.neumo-btn--md {
  min-height: 44px;
  padding: 0 24px;
  font-size: 0.95rem;
}

.neumo-btn--lg {
  min-height: 54px;
  padding: 0 36px;
  font-size: 1.05rem;
}

.neumo-btn--primary {
  background: var(--color-accent);
  color: #04100c;
  box-shadow: var(--shadow-sm);
}

.neumo-btn--primary:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.neumo-btn--primary:active {
  box-shadow: var(--shadow-inset-sm);
  transform: translateY(0);
}

.neumo-btn--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.neumo-btn--secondary:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.neumo-btn--secondary:active {
  box-shadow: var(--shadow-inset-sm);
  transform: translateY(0);
}

.neumo-btn--danger {
  background: var(--color-danger);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.neumo-btn--danger:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.neumo-btn--danger:active {
  box-shadow: var(--shadow-inset-sm);
  transform: translateY(0);
}

.neumo-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  pointer-events: none;
}
</style>
