import type { CapitalRequest, CapitalRequestStatus } from "./types";

export type CapitalRequestRow = {
  id: string;
  event_name: string;
  location: string;
  event_date: string | null;
  billing_estimate: number;
  modal_estimate: number;
  status: CapitalRequestStatus;
  investor_note: string | null;
  submitted_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  payment_proof_url: string | null;
  payment_proof_storage_path: string | null;
};

export function rowToCapitalRequest(row: CapitalRequestRow): CapitalRequest {
  return {
    id: row.id,
    eventName: row.event_name,
    location: row.location,
    eventDate: row.event_date ?? undefined,
    billingEstimate: row.billing_estimate,
    modalEstimate: row.modal_estimate,
    status: row.status,
    investorNote: row.investor_note ?? undefined,
    submittedBy: row.submitted_by ?? undefined,
    decidedBy: row.decided_by ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    createdAt: row.created_at,
    paymentProofUrl: row.payment_proof_url ?? undefined,
    paymentProofStoragePath: row.payment_proof_storage_path ?? undefined,
  };
}
