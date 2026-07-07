<script setup lang="ts">
import { ref } from 'vue';
import BmiTool from './components/BmiTool.vue';
import DataBackup from './components/DataBackup.vue';
import LedgerTool from './components/LedgerTool.vue';
import { usePersonalRecords } from './composables/usePersonalRecords';
import type { BmiInput, LedgerInput, Tab } from './types';

const activeTab = ref<Tab>('ledger');

const {
  records,
  addLedgerEntry,
  removeLedgerEntry,
  addBmiEntry,
  removeBmiEntry,
  importRecords,
} = usePersonalRecords();

function handleLedgerAdd(entry: LedgerInput) {
  addLedgerEntry(entry);
}

function handleBmiAdd(entry: BmiInput) {
  addBmiEntry(entry);
}
</script>

<template>
  <main class="app-shell">
    <section class="intro">
      <div>
        <p class="eyebrow">本地数据 · 个人使用</p>
        <h1>个人记录本</h1>
        <p class="intro-copy">记账和 BMI 变化放在同一个轻量工具里，所有数据只保存在当前浏览器。</p>
      </div>

      <DataBackup :records="records" @import="importRecords" />
    </section>

    <nav class="tabs" aria-label="功能切换">
      <button :class="{ active: activeTab === 'ledger' }" type="button" @click="activeTab = 'ledger'">记账</button>
      <button :class="{ active: activeTab === 'bmi' }" type="button" @click="activeTab = 'bmi'">BMI</button>
    </nav>

    <LedgerTool
      v-if="activeTab === 'ledger'"
      :entries="records.ledger"
      @add="handleLedgerAdd"
      @remove="removeLedgerEntry"
    />

    <BmiTool
      v-else
      :entries="records.bmi"
      @add="handleBmiAdd"
      @remove="removeBmiEntry"
    />
  </main>
</template>
