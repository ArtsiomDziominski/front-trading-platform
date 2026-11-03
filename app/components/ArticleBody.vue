<script setup lang="ts">
import type { ArticleBlock } from '#shared/types/article'

/** Article blocks from the API. Everything is plain text (no v-html); unknown block types are skipped. */
const props = defineProps<{
  blocks: ArticleBlock[]
}>()

const localePath = useLocalePath()

/** `href` is an internal path from the API rather than a typed route, so it goes in as a plain path. */
function ctaPath(href: string): string {
  return localePath(href as Parameters<typeof localePath>[0])
}

/** A plain number, signed amount or percent: "6", "+74 USDT", "−60 USDT", "12.5%". */
const NUMBER_CELL = /^[+\-−]?\d[\d\s.,]*(?:%|\s?USDT)?$/

/** Cells up to this length never wrap, so "6 месяцев" stays on one line and a narrow screen scrolls the table. */
const SHORT_CELL = 16

interface ColumnLayout {
  /** Only numbers: aligned right, header included. */
  numeric: boolean
  /** Only short values: kept on one line. */
  short: boolean
}

function tableLayout(block: Extract<ArticleBlock, { type: 'table' }>): ColumnLayout[] {
  return block.columns.map((_, index) => {
    const cells = block.rows.map((row) => (row[index] ?? '').trim())
    return {
      numeric: cells.every((cell) => NUMBER_CELL.test(cell)),
      short: cells.every((cell) => cell.length <= SHORT_CELL),
    }
  })
}

/** Per block: the column layout of a table (empty for other blocks). */
const layouts = computed(() => props.blocks.map((block) => (block.type === 'table' ? tableLayout(block) : [])))
</script>

<template>
  <div class="article-body">
    <template v-for="(block, index) in blocks" :key="index">
      <h2 v-if="block.type === 'heading'" class="article-body__heading">
        {{ block.text }}
      </h2>

      <p v-else-if="block.type === 'paragraph'" class="article-body__paragraph">
        {{ block.text }}
      </p>

      <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.type === 'list'" class="article-body__list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          {{ item }}
        </li>
      </component>

      <pre v-else-if="block.type === 'formula'" class="article-body__formula">{{ block.text }}</pre>

      <aside
        v-else-if="block.type === 'callout'"
        class="article-body__callout"
        :class="`article-body__callout--${block.tone}`"
      >
        <UIcon
          :name="block.tone === 'warning' ? 'i-lucide-triangle-alert' : 'i-lucide-info'"
          class="article-body__callout-icon"
          aria-hidden="true"
        />
        <p>{{ block.text }}</p>
      </aside>

      <div v-else-if="block.type === 'table'" class="article-body__table-wrap">
        <table class="article-body__table">
          <thead>
            <tr>
              <th
                v-for="(column, columnIndex) in block.columns"
                :key="columnIndex"
                scope="col"
                :class="{ 'is-numeric': layouts[index]?.[columnIndex]?.numeric }"
              >
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                :class="{ 'is-numeric': layouts[index]?.[cellIndex]?.numeric, 'is-short': layouts[index]?.[cellIndex]?.short }"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="block.type === 'cta'" class="article-body__cta">
        <AppButton :to="ctaPath(block.href)" trailing-icon="i-lucide-arrow-right">
          {{ block.text }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.article-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: rgb(255 255 255 / 86%);
  font-size: 1.02rem;
  line-height: 1.75;
}

.article-body__heading {
  margin: 22px 0 -4px;
  color: #fff;
  font-family: Inter, "DM Sans", ui-sans-serif, system-ui, sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.article-body__paragraph {
  margin: 0;
}

.article-body__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding-left: 1.3em;
}

ul.article-body__list {
  list-style: disc;
}

ol.article-body__list {
  list-style: decimal;
}

.article-body__list li::marker {
  color: var(--color-accent);
}

.article-body__formula {
  margin: 0;
  padding: 16px 18px;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: rgb(255 255 255 / 4%);
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92rem;
  line-height: 1.7;
  white-space: pre;
}

.article-body__callout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid;
  border-radius: var(--radius-sm);
}

.article-body__callout p {
  margin: 0;
}

.article-body__callout--info {
  border-color: rgb(96 165 250 / 30%);
  background: rgb(96 165 250 / 8%);
}

.article-body__callout--warning {
  border-color: rgb(245 166 35 / 35%);
  background: rgb(245 166 35 / 8%);
}

.article-body__callout-icon {
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  margin-top: 0.3em;
}

.article-body__callout--info .article-body__callout-icon {
  color: var(--color-info);
}

.article-body__callout--warning .article-body__callout-icon {
  color: var(--color-warning);
}

.article-body__table-wrap {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.article-body__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  line-height: 1.45;
}

.article-body__table th,
.article-body__table td {
  padding: 10px 14px;
  text-align: left;
  vertical-align: top;
}

.article-body__table th {
  background: rgb(255 255 255 / 4%);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.article-body__table tbody tr + tr td {
  border-top: 1px solid rgb(255 255 255 / 6%);
}

.article-body__table .is-numeric {
  text-align: right;
}

.article-body__table td.is-numeric {
  font-variant-numeric: tabular-nums;
}

.article-body__table td.is-short {
  white-space: nowrap;
}

.article-body__cta {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .article-body {
    gap: 16px;
    font-size: 1rem;
    line-height: 1.7;
  }

  .article-body__heading {
    margin-top: 16px;
    font-size: 1.25rem;
  }

  .article-body__table {
    font-size: 0.85rem;
  }

  .article-body__table th,
  .article-body__table td {
    padding: 8px;
  }
}
</style>
