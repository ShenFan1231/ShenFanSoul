export type LedgerType = 'expense' | 'income';
export type LedgerFilter = 'all' | LedgerType;
export type Tab = 'ledger' | 'bmi';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  category: string;
  date: string;
  note: string;
}

export interface BmiEntry {
  id: string;
  height: number;
  weight: number;
  date: string;
  note: string;
}

export interface StoredData {
  ledger: LedgerEntry[];
  bmi: BmiEntry[];
}

export type LedgerInput = Omit<LedgerEntry, 'id'>;
export type BmiInput = Omit<BmiEntry, 'id'>;
