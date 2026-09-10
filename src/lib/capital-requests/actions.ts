"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { notifyDivision } from "@/lib/push/notify";
import { logActivity } from "@/lib/activity/log";
import { formatRupiah } from "@/lib/shared/utils";
import type { CapitalRequestStatus } from "./types";

const ADMIN_PATH = "/dashboard/admin/pengajuan-modal";
const INVESTOR_PATH = "/dashboard/investor/pengajuan-modal";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

export type MutationResult = { ok: true } | { ok: false; error: string };

export type NewCapitalRequestInput = {
  eventName: string;
  location: string;
  eventDate?: string;
  billingEstimate: number;
  modalEstimate: number;
};

/**
 * HANYA akses penuh (Owner/Finance/Admin) yang boleh mengajukan modal —
 * sesuai rancangan, pengajuan ini datang dari Owner, bukan staf per divisi.
 * Begitu tersimpan, investor langsung dapat notifikasi push untuk memutuskan.
 */
export async function addCapitalRequest(input: NewCapitalRequestInput): Promise<MutationResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    return { ok: false, error: "Hanya akun akses penuh yang bisa mengajukan modal." };
  }

  // Divalidasi ulang di server — form di UI sudah punya `required`/`min`,
  // tapi Server Action ini bisa dipanggil langsung sebagai fungsi (bukan
  // cuma lewat submit form biasa), jadi validasi HTML saja tidak cukup.
  const eventName = input.eventName?.trim();
  const location = input.location?.trim();
  if (!eventName || !location) {
    return { ok: false, error: "Nama event dan lokasi wajib diisi." };
  }
  if (
    !Number.isFinite(input.billingEstimate) ||
    input.billingEstimate < 0 ||
    !Number.isFinite(input.modalEstimate) ||
    input.modalEstimate < 0
  ) {
    return { ok: false, error: "Perkiraan Billing dan Modal harus angka 0 atau lebih." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("capital_requests").insert({
    event_name: eventName,
    location,
    event_date: input.eventDate || null,
    billing_estimate: input.billingEstimate,
    modal_estimate: input.modalEstimate,
    submitted_by: profile.id,
  });

  if (error) {
    console.error("[capital-requests] addCapitalRequest gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(INVESTOR_PATH);
  void logActivity({
    module: "admin",
    action: "create",
    entityType: "pengajuan modal",
    entityLabel: eventName,
    detail: `Billing ${formatRupiah(input.billingEstimate)}, Modal ${formatRupiah(input.modalEstimate)}`,
  });
  void notifyDivision(["investor"], {
    title: "Pengajuan Modal Baru",
    body: `${eventName} — Billing ${formatRupiah(input.billingEstimate)} / Modal ${formatRupiah(input.modalEstimate)}`,
    url: INVESTOR_PATH,
  });

  return { ok: true };
}

/**
 * HANYA boleh menghapus pengajuan yang masih "Menunggu" — begitu investor
 * sudah memutuskan (Disetujui/Ditolak), keputusan itu jadi jejak permanen,
 * sama seperti alasan `production_purchase_orders` tidak bisa dihapus
 * setelah "Diterima" (migrasi 0018).
 */
export async function deleteCapitalRequest(id: string): Promise<MutationResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    return { ok: false, error: "Hanya akun akses penuh yang bisa menghapus pengajuan." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("capital_requests")
    .select("event_name, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Pengajuan ini sudah tidak ada — mungkin sudah dihapus lebih dulu." };
  }
  if (existing.status !== "Menunggu") {
    return { ok: false, error: "Pengajuan yang sudah diputuskan investor tidak bisa dihapus." };
  }

  const { error } = await supabase.from("capital_requests").delete().eq("id", id);
  if (error) {
    console.error("[capital-requests] deleteCapitalRequest gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(INVESTOR_PATH);
  void logActivity({
    module: "admin",
    action: "delete",
    entityType: "pengajuan modal",
    entityLabel: existing?.event_name,
  });

  return { ok: true };
}

/**
 * Keputusan investor (Approve/Reject + catatan) — dieksekusi lewat fungsi
 * database `decide_capital_request` (migrasi 0019) yang mengunci baris &
 * mengecek ulang divisi di server, supaya tidak bisa diputuskan dua kali
 * atau dipanggil orang yang bukan investor walau lolos dari UI.
 *
 * Begitu disetujui, staf operasional (Magnarent/Magnative/Production) dapat
 * notifikasi pengumuman biasa untuk bersiap — mereka TIDAK ikut memutuskan,
 * sesuai rancangan Owner.
 */
export async function decideCapitalRequest(
  id: string,
  status: CapitalRequestStatus,
  note: string
): Promise<MutationResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "investor") {
    return { ok: false, error: "Hanya akun investor yang bisa memutuskan pengajuan modal." };
  }
  if (status !== "Disetujui" && status !== "Ditolak") {
    return { ok: false, error: "Status tidak valid." };
  }

  const supabase = await createClient();
  const { data: requestRow } = await supabase
    .from("capital_requests")
    .select("event_name, location, event_date")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.rpc("decide_capital_request", {
    request_id: id,
    new_status: status,
    note: note.trim() || null,
  });

  if (error) {
    console.error("[capital-requests] decideCapitalRequest gagal:", error.message);
    return { ok: false, error: error.message || GENERIC_ERROR };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(INVESTOR_PATH);
  void logActivity({
    module: "admin",
    action: "status_change",
    entityType: "pengajuan modal",
    entityLabel: requestRow?.event_name,
    detail: `status → ${status}${note.trim() ? `, catatan: ${note.trim()}` : ""}`,
  });

  if (status === "Disetujui" && requestRow) {
    const tanggal = requestRow.event_date ? ` (${requestRow.event_date})` : " (tanggal menyusul)";
    void notifyDivision(["magnarent", "magnative", "production"], {
      title: "Event Baru Disetujui — Siap-siap!",
      body: `${requestRow.event_name}${tanggal} di ${requestRow.location} sudah disetujui investor, segera persiapan.`,
      url: "/dashboard",
    });
  }

  return { ok: true };
}

/** Dipakai layout /dashboard/investor untuk menolak akses selain investor/akses penuh. */
export async function requireInvestorAccess() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.division !== "investor" && profile.division !== "all")) {
    redirect("/dashboard");
  }
  return profile;
}
