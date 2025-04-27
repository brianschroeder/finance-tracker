export interface Transaction {
  id: number;
  date: string;
  name: string;
  amount: number;
  categoryId: number | null;
  payee?: string;
  notes?: string;
  cashBack?: number;
  category?: {
    id: number;
    name: string;
    color: string;
  };
}

export interface RecurringTransaction {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
  categoryId: number | null;
  lastPaidDate?: string | null;
  notes?: string;
  category?: {
    id: number;
    name: string;
    color: string;
  };
} 