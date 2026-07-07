<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { LedgerEntry, LedgerFilter, LedgerInput, LedgerType } from '../types';
import { getToday } from '../utils/date';
import { formatMoney } from '../utils/format';

const props = defineProps<{
  entries: LedgerEntry[];
}>();

const emit = defineEmits<{
  add: [entry: LedgerInput];
  remove: [id: string];
}>();

const expenseCategories = ['餐饮', '交通', '购物', '住房', '娱乐', '医疗', '学习', '其他'];
const incomeCategories = ['工资', '奖金', '副业', '理财', '报销', '其他'];

const ledgerFilter = ref<LedgerFilter>('all');

const ledgerForm = reactive({
  type: 'expense' as LedgerType,
  amount: '',
  category: expenseCategories[0],
  date: getToday(),
  note: '',
});

const categoryOptions = computed(() =>
  ledgerForm.type === 'expense' ? expenseCategories : incomeCategories,
);

const filteredEntries = computed(() =>
  [...props.entries]
    .filter((entry) => ledgerFilter.value === 'all' || entry.type === ledgerFilter.value)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

const totalIncome = computed(() =>
  props.entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0),
);

const totalExpense = computed(() =>
  props.entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0),
);

const balance = computed(() => totalIncome.value - totalExpense.value);

function selectLedgerType(type: LedgerType) {
  ledgerForm.type = type;
  ledgerForm.category = type === 'expense' ? expenseCategories[0] : incomeCategories[0];
}

function submitLedgerEntry() {
  const amount = Number(ledgerForm.amount);
  if (!amount || amount <= 0) return;

  emit('add', {
    type: ledgerForm.type,
    amount,
    category: ledgerForm.category,
    date: ledgerForm.date || getToday(),
    note: ledgerForm.note.trim(),
  });

  ledgerForm.amount = '';
  ledgerForm.note = '';
}
</script>

<template>
  <section class="workspace">
    <aside class="panel form-panel">
      <div class="panel-heading">
        <span class="panel-icon">¥</span>
        <h2>新增账目</h2>
      </div>

      <div class="segmented">
        <button :class="{ active: ledgerForm.type === 'expense' }" type="button" @click="selectLedgerType('expense')">
          支出
        </button>
        <button :class="{ active: ledgerForm.type === 'income' }" type="button" @click="selectLedgerType('income')">
          收入
        </button>
      </div>

      <form class="record-form" @submit.prevent="submitLedgerEntry">
        <label>
          金额
          <input v-model="ledgerForm.amount" inputmode="decimal" min="0" step="0.01" type="number" placeholder="0.00" />
        </label>
        <label>
          分类
          <select v-model="ledgerForm.category">
            <option v-for="category in categoryOptions" :key="category" :value="category">{{ category }}</option>
          </select>
        </label>
        <label>
          日期
          <input v-model="ledgerForm.date" type="date" />
        </label>
        <label>
          备注
          <input v-model="ledgerForm.note" type="text" placeholder="可选" />
        </label>
        <button class="primary-button" type="submit">保存账目</button>
      </form>
    </aside>

    <div class="content-stack">
      <div class="summary-grid">
        <article class="metric">
          <span>收入</span>
          <strong>{{ formatMoney(totalIncome) }}</strong>
        </article>
        <article class="metric">
          <span>支出</span>
          <strong>{{ formatMoney(totalExpense) }}</strong>
        </article>
        <article class="metric balance">
          <span>结余</span>
          <strong>{{ formatMoney(balance) }}</strong>
        </article>
      </div>

      <section class="panel">
        <div class="list-toolbar">
          <h2>账目明细</h2>
          <div class="filter-group">
            <button :class="{ active: ledgerFilter === 'all' }" type="button" @click="ledgerFilter = 'all'">全部</button>
            <button :class="{ active: ledgerFilter === 'expense' }" type="button" @click="ledgerFilter = 'expense'">支出</button>
            <button :class="{ active: ledgerFilter === 'income' }" type="button" @click="ledgerFilter = 'income'">收入</button>
          </div>
        </div>

        <ul v-if="filteredEntries.length" class="record-list">
          <li v-for="entry in filteredEntries" :key="entry.id">
            <div class="record-main">
              <span :class="['type-dot', entry.type]"></span>
              <div>
                <strong>{{ entry.category }}</strong>
                <small>{{ entry.date }}<template v-if="entry.note"> · {{ entry.note }}</template></small>
              </div>
            </div>
            <div class="record-side">
              <span :class="entry.type">{{ entry.type === 'expense' ? '-' : '+' }}{{ formatMoney(entry.amount) }}</span>
              <button class="icon-button" type="button" aria-label="删除账目" @click="emit('remove', entry.id)">×</button>
            </div>
          </li>
        </ul>
        <p v-else class="empty-state">还没有账目，先记一笔今天的收支。</p>
      </section>
    </div>
  </section>
</template>
