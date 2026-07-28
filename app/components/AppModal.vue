<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  overlay?: boolean
  scrollable?: boolean
  transition?: boolean
  fullscreen?: boolean
  portal?: boolean | string | HTMLElement
  close?: boolean | Record<string, unknown>
  closeIcon?: string
  dismissible?: boolean
  class?: unknown
  ui?: Record<string, unknown>
  /** Breakpoint for modal (desktop) vs bottom sheet (mobile). Default: md */
  desktopQuery?: string
}>(), {
  overlay: true,
  scrollable: false,
  transition: true,
  fullscreen: false,
  portal: true,
  close: true,
  dismissible: true,
  desktopQuery: '(min-width: 768px)',
})

const emit = defineEmits<{
  'after:leave': []
  'after:enter': []
  'close:prevent': []
}>()

const isDesktop = useMediaQuery(() => props.desktopQuery)
</script>

<template>
  <ClientOnly>
    <UModal
      v-if="isDesktop"
      v-model:open="open"
      :title="title"
      :description="description"
      :overlay="overlay"
      :scrollable="scrollable"
      :transition="transition"
      :fullscreen="fullscreen"
      :portal="portal"
      :close="close"
      :close-icon="closeIcon"
      :dismissible="dismissible"
      :class="props.class"
      :ui="ui"
      @after:leave="emit('after:leave')"
      @after:enter="emit('after:enter')"
      @close:prevent="emit('close:prevent')"
    >
      <slot />

      <template v-if="$slots.content" #content="slotProps">
        <slot name="content" v-bind="slotProps" />
      </template>

      <template v-if="$slots.header" #header="slotProps">
        <slot name="header" v-bind="slotProps" />
      </template>

      <template v-if="$slots.title" #title>
        <slot name="title" />
      </template>

      <template v-if="$slots.description" #description>
        <slot name="description" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>

      <template v-if="$slots.close" #close="slotProps">
        <slot name="close" v-bind="slotProps" />
      </template>

      <template v-if="$slots.body" #body="slotProps">
        <slot name="body" v-bind="slotProps" />
      </template>

      <template v-if="$slots.footer" #footer="slotProps">
        <slot name="footer" v-bind="slotProps" />
      </template>
    </UModal>

    <UDrawer
      v-else
      v-model:open="open"
      direction="bottom"
      :title="title"
      :description="description"
      :overlay="overlay"
      :portal="portal"
      :dismissible="dismissible"
      :class="props.class"
      :ui="ui"
      @close:prevent="emit('close:prevent')"
    >
      <slot />

      <template v-if="$slots.content" #content>
        <slot name="content" />
      </template>

      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <template v-if="$slots.title" #title>
        <slot name="title" />
      </template>

      <template v-if="$slots.description" #description>
        <slot name="description" />
      </template>

      <template v-if="$slots.body" #body>
        <slot name="body" />
      </template>

      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </UDrawer>
  </ClientOnly>
</template>
