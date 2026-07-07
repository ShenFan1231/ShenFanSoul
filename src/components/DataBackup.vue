<script setup lang="ts">
import { ref } from 'vue';
import type { StoredData } from '../types';
import { getToday } from '../utils/date';

const props = defineProps<{
  records: StoredData;
}>();

const emit = defineEmits<{
  import: [records: Partial<StoredData>];
}>();

const importFile = ref<HTMLInputElement | null>(null);

function exportData() {
  const blob = new Blob([JSON.stringify(props.records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `personal-records-${getToday()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    emit('import', JSON.parse(await file.text()) as Partial<StoredData>);
  } finally {
    input.value = '';
  }
}
</script>

<template>
  <div class="actions">
    <button class="ghost-button" type="button" @click="exportData">导出</button>
    <button class="ghost-button" type="button" @click="importFile?.click()">导入</button>
    <input ref="importFile" class="sr-only" type="file" accept="application/json" @change="importData" />
  </div>
</template>
