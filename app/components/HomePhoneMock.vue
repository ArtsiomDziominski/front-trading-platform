<script setup lang="ts">
const rows = [
  { pair: 'BTC/USDT', strategy: 'Grid Futures', pnl: '+2.41%', up: true },
  { pair: 'ETH/USDT', strategy: 'DCA Spot', pnl: '+1.18%', up: true },
  { pair: 'SOL/USDT', strategy: 'Grid Spot', pnl: '+3.86%', up: true },
  { pair: 'BNB/USDT', strategy: 'Custom', pnl: '−0.42%', up: false },
] as const
</script>

<template>
  <div
    class="phone"
    aria-hidden="true"
  >
    <div class="phone__notch" />
    <div class="phone__screen">
      <div class="phone__status">
        <span>9:41</span>
        <span class="phone__status-dots">
          <i /><i /><i />
        </span>
      </div>

      <div class="phone__head">
        <span class="phone__eyebrow">Bot Platform</span>
        <div class="phone__balance-row">
          <div>
            <span class="phone__label">Portfolio</span>
            <strong class="phone__balance">$24,580.42</strong>
          </div>
          <span class="phone__chip">+4.7% 24h</span>
        </div>
      </div>

      <div class="phone__chart">
        <svg
          viewBox="0 0 240 72"
          preserveAspectRatio="none"
        >
          <path
            class="phone__chart-fill"
            d="M0 52 C28 48 40 30 60 34 C84 40 96 18 120 22 C148 28 160 10 180 16 C200 22 220 8 240 12 L240 72 L0 72 Z"
          />
          <path
            class="phone__chart-line"
            d="M0 52 C28 48 40 30 60 34 C84 40 96 18 120 22 C148 28 160 10 180 16 C200 22 220 8 240 12"
            fill="none"
          />
        </svg>
      </div>

      <div class="phone__tabs">
        <span class="is-active">Bots</span>
        <span>Markets</span>
        <span>Alerts</span>
      </div>

      <div class="phone__list">
        <div
          v-for="row in rows"
          :key="row.pair"
          class="phone__row"
        >
          <div
            class="phone__avatar"
            :class="{ 'phone__avatar--down': !row.up }"
          />
          <div class="phone__meta">
            <div class="phone__pair">{{ row.pair }}</div>
            <div class="phone__strategy">{{ row.strategy }}</div>
          </div>
          <div
            class="phone__pnl"
            :class="{ 'phone__pnl--down': !row.up }"
          >
            {{ row.pnl }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone {
  position: relative;
  overflow: hidden;
  border: 10px solid #2a2f34;
  border-radius: 40px;
  background: #121416;
  box-shadow:
    0 40px 90px rgb(0 0 0 / 48%),
    inset 0 0 0 1px rgb(255 255 255 / 8%);
}

.phone__notch {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 50%;
  width: 38%;
  height: 18px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #0a0c0e;
}

.phone__screen {
  display: grid;
  gap: 12px;
  min-height: 560px;
  padding: 34px 16px 18px;
  background:
    radial-gradient(circle at 50% 0%, rgb(186 242 74 / 22%), transparent 42%),
    linear-gradient(180deg, #1b232a 0%, #0d1114 100%);
}

.phone__status {
  display: flex;
  justify-content: space-between;
  color: rgb(255 255 255 / 70%);
  font-size: 0.72rem;
  font-weight: 650;
}

.phone__status-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}

.phone__status-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(255 255 255 / 55%);
}

.phone__head {
  display: grid;
  gap: 10px;
}

.phone__eyebrow {
  color: #baf24a;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.phone__balance-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.phone__label {
  display: block;
  color: rgb(255 255 255 / 55%);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.phone__balance {
  display: block;
  margin-top: 2px;
  color: #fff;
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.phone__chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgb(186 242 74 / 16%);
  color: #baf24a;
  font-size: 0.75rem;
  font-weight: 750;
}

.phone__chart {
  height: 72px;
  border-radius: 16px;
  overflow: hidden;
  background: rgb(255 255 255 / 3%);
}

.phone__chart svg {
  width: 100%;
  height: 100%;
}

.phone__chart-fill {
  fill: rgb(186 242 74 / 18%);
}

.phone__chart-line {
  stroke: #baf24a;
  stroke-width: 2.5;
}

.phone__tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: rgb(255 255 255 / 4%);
}

.phone__tabs span {
  padding: 8px 4px;
  border-radius: 10px;
  color: rgb(255 255 255 / 55%);
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
}

.phone__tabs .is-active {
  background: rgb(186 242 74 / 16%);
  color: #e5ffc3;
}

.phone__list {
  display: grid;
  gap: 8px;
}

.phone__row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 11px;
  border-radius: 16px;
  background: rgb(255 255 255 / 4.5%);
  border: 1px solid rgb(255 255 255 / 5%);
}

.phone__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgb(186 242 74 / 75%), transparent 42%),
    #24303a;
}

.phone__avatar--down {
  background:
    radial-gradient(circle at 35% 30%, rgb(251 113 133 / 70%), transparent 42%),
    #2a1c22;
}

.phone__pair {
  color: #fff;
  font-size: 0.88rem;
  font-weight: 750;
}

.phone__strategy {
  margin-top: 2px;
  color: rgb(255 255 255 / 48%);
  font-size: 0.7rem;
}

.phone__pnl {
  color: #baf24a;
  font-size: 0.85rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.phone__pnl--down {
  color: #fb7185;
}

@media (max-width: 640px) {
  .phone__screen {
    min-height: 480px;
  }
}
</style>
