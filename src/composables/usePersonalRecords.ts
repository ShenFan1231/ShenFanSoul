import { ref, watch } from 'vue';
import type { BmiInput, LedgerInput, StoredData } from '../types';

const storageKey = 'personal-records-v1';

const emptyRecords: StoredData = {
  ledger: [],
  bmi: [],
};

export function usePersonalRecords() {
  const records = ref<StoredData>(loadRecords());

  watch(
    records,
    (value) => {
      localStorage.setItem(storageKey, JSON.stringify(value));
    },
    { deep: true },
  );

  function addLedgerEntry(entry: LedgerInput) {
    records.value.ledger.unshift({
      ...entry,
      id: createId(),
    });
  }

  function removeLedgerEntry(id: string) {
    records.value.ledger = records.value.ledger.filter((entry) => entry.id !== id);
  }

  function addBmiEntry(entry: BmiInput) {
    records.value.bmi.unshift({
      ...entry,
      id: createId(),
    });
  }

  function removeBmiEntry(id: string) {
    records.value.bmi = records.value.bmi.filter((entry) => entry.id !== id);
  }

  function importRecords(imported: Partial<StoredData>) {
    records.value = {
      ledger: Array.isArray(imported.ledger) ? imported.ledger : records.value.ledger,
      bmi: Array.isArray(imported.bmi) ? imported.bmi : records.value.bmi,
    };
  }

  return {
    records,
    addLedgerEntry,
    removeLedgerEntry,
    addBmiEntry,
    removeBmiEntry,
    importRecords,
  };
}

function loadRecords(): StoredData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(emptyRecords);

  try {
    const parsed = JSON.parse(raw) as Partial<StoredData>;

    return {
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      bmi: Array.isArray(parsed.bmi) ? parsed.bmi : [],
    };
  } catch {
    return structuredClone(emptyRecords);
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
