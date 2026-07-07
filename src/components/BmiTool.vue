<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { BmiEntry, BmiInput } from '../types';
import { getToday } from '../utils/date';
import { toBmiResult } from '../utils/format';

const props = defineProps<{
  entries: BmiEntry[];
}>();

const emit = defineEmits<{
  add: [entry: BmiInput];
  remove: [id: string];
}>();

const bmiRangeMin = 14;
const bmiRangeMax = 32;

const bmiRanges = [
  { label: '偏瘦', range: '<18.5', className: 'underweight', start: 14, end: 18.5 },
  { label: '正常', range: '18.5-23.9', className: 'normal', start: 18.5, end: 24 },
  { label: '超重', range: '24.0-27.9', className: 'overweight', start: 24, end: 28 },
  { label: '肥胖', range: '>=28.0', className: 'obese', start: 28, end: 32 },
];

const bmiForm = reactive({
  height: '',
  weight: '',
  date: getToday(),
  note: '',
});

const bmiEntries = computed(() =>
  [...props.entries].sort((a, b) => b.date.localeCompare(a.date)),
);

const latestBmi = computed(() => {
  const latest = bmiEntries.value[0];
  return latest ? toBmiResult(latest.height, latest.weight) : null;
});

const bmiPointerPosition = computed(() => {
  if (!latestBmi.value) return 0;

  const clamped = Math.min(Math.max(latestBmi.value.value, bmiRangeMin), bmiRangeMax);
  return ((clamped - bmiRangeMin) / (bmiRangeMax - bmiRangeMin)) * 100;
});

function getRangeWidth(start: number, end: number) {
  return `${((end - start) / (bmiRangeMax - bmiRangeMin)) * 100}%`;
}

function submitBmiEntry() {
  const height = Number(bmiForm.height);
  const weight = Number(bmiForm.weight);
  if (!height || !weight || height <= 0 || weight <= 0) return;

  emit('add', {
    height,
    weight,
    date: bmiForm.date || getToday(),
    note: bmiForm.note.trim(),
  });

  bmiForm.weight = '';
  bmiForm.note = '';
}
</script>

<template>
  <section class="workspace">
    <aside class="panel form-panel">
      <div class="panel-heading">
        <span class="panel-icon">BMI</span>
        <h2>新增 BMI</h2>
      </div>

      <form class="record-form" @submit.prevent="submitBmiEntry">
        <label>
          身高 cm
          <input v-model="bmiForm.height" inputmode="decimal" min="0" step="0.1" type="number" placeholder="例如 175" />
        </label>
        <label>
          体重 kg
          <input v-model="bmiForm.weight" inputmode="decimal" min="0" step="0.1" type="number" placeholder="例如 68.5" />
        </label>
        <label>
          日期
          <input v-model="bmiForm.date" type="date" />
        </label>
        <label>
          备注
          <input v-model="bmiForm.note" type="text" placeholder="可选" />
        </label>
        <button class="primary-button" type="submit">保存 BMI</button>
      </form>
    </aside>

    <div class="content-stack">
      <section class="bmi-visual">
        <div class="bmi-current">
          <span>当前 BMI</span>
          <strong>{{ latestBmi ? latestBmi.value.toFixed(1) : '--' }}</strong>
          <small :class="['bmi-status', latestBmi?.label]">{{ latestBmi ? latestBmi.label : '暂无记录' }}</small>
        </div>

        <div class="bmi-range-card">
          <div class="bmi-scale" aria-label="BMI 所处范围">
            <span
              v-for="range in bmiRanges"
              :key="range.label"
              :class="range.className"
              :style="{ width: getRangeWidth(range.start, range.end) }"
            ></span>
            <i
              v-if="latestBmi"
              class="bmi-pointer"
              :style="{ left: `${bmiPointerPosition}%` }"
              aria-hidden="true"
            >
              <b>{{ latestBmi.value.toFixed(1) }}</b>
            </i>
          </div>

          <div class="bmi-range-labels">
            <span
              v-for="range in bmiRanges"
              :key="range.range"
              :class="range.className"
              :style="{ width: getRangeWidth(range.start, range.end) }"
            >
              <b>{{ range.label }}</b>
              <small>{{ range.range }}</small>
            </span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="list-toolbar">
          <h2>BMI 历史</h2>
        </div>

        <ul v-if="bmiEntries.length" class="record-list">
          <li v-for="entry in bmiEntries" :key="entry.id">
            <div class="record-main">
              <span class="type-dot bmi"></span>
              <div>
                <strong>{{ toBmiResult(entry.height, entry.weight).value.toFixed(1) }} · {{ toBmiResult(entry.height, entry.weight).label }}</strong>
                <small>{{ entry.date }} · {{ entry.height }}cm · {{ entry.weight }}kg<template v-if="entry.note"> · {{ entry.note }}</template></small>
              </div>
            </div>
            <button class="icon-button" type="button" aria-label="删除 BMI 记录" @click="emit('remove', entry.id)">×</button>
          </li>
        </ul>
        <p v-else class="empty-state">还没有 BMI 记录，输入一次身高体重即可开始跟踪。</p>
      </section>
    </div>
  </section>
</template>
