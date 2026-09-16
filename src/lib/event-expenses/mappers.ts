import type {
  EventExpense,
  ExpenseCategory,
  ExpenseDivision,
  ExpenseProof,
  ExpenseSourceType,
  ReimbursementStatus,
} from "./types";

export type EventExpenseRow = {
  id: string;
  expense_date: string;
  division: string;
  source_type: string;
  source_id: string | null;
  category: string;
  amount: number;
  pic_name: string;
  payment_method: string;
  reimbursement_status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type EventExpenseProofRow = {
  id: string;
  expense_id: string;
  file_url: string;
  storage_path: string;
  file_name: string;
  uploaded_at: string;
};

export function rowToExpenseProof(row: EventExpenseProofRow): ExpenseProof {
  return {
    id: row.id,
    expenseId: row.expense_id,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
  };
}

export function rowToEventExpense(row: EventExpenseRow, proofs: ExpenseProof[]): EventExpense {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    division: row.division as ExpenseDivision,
    sourceType: row.source_type as ExpenseSourceType,
    sourceId: row.source_id,
    category: row.category as ExpenseCategory,
    amount: row.amount,
    picName: row.pic_name,
    paymentMethod: row.payment_method,
    reimbursementStatus: row.reimbursement_status as ReimbursementStatus,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    proofs,
  };
}
