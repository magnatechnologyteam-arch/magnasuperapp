import { createClient } from "@/lib/supabase/server";

export type ActivityModule = "magnarent" | "magnative" | "production" | "admin";
export type ActivityAction = "create" | "update" | "delete" | "status_change";

export type LogActivityInput = {
  module: ActivityModule;
  action: ActivityAction;
  /** Jenis entitas dalam Bahasa Indonesia, mis. "booking", "inventaris", "klien". */
  entityType: string;
  /** Nama yang gampang dikenali manusia, mis. nama klien atau nama alat. */
  entityLabel?: string;
  /** Info tambahan opsional, mis. "status → Dikonfirmasi". */
  detail?: string;
};

/**
 * Dipanggil dari Server Action tiap modul (magnarent/magnative/
 * production/admin) SETELAH sebuah mutasi berhasil — bukan sebelum, dan
 * bukan menggantikan pengecekan bisnis yang sudah ada. Sama seperti
 * `notifyDivision` (lihat src/lib/push/notify.ts): sengaja TIDAK PERNAH
 * melempar error ke pemanggil, supaya kegagalan mencatat log tidak sampai
 * membatalkan aksi bisnis yang sudah tersimpan — cukup dicatat ke
 * console.error server.
 *
 * Pakai client Supabase biasa (bukan admin/service-role) — RLS
 * `activity_log_insert_any_authenticated` (migrasi 0008) sudah mengizinkan
 * siapa pun yang login untuk menulis baris log-nya sendiri, jadi tidak
 * perlu melewati RLS di sini.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const division =
      (user.app_metadata as { division?: string } | null | undefined)?.division ?? "production";
    const actorName =
      (user.user_metadata as { full_name?: string } | null | undefined)?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      "Pengguna";

    const { error } = await supabase.from("activity_log").insert({
      actor_id: user.id,
      actor_name: actorName,
      division,
      module: input.module,
      action: input.action,
      entity_type: input.entityType,
      entity_label: input.entityLabel ?? null,
      detail: input.detail ?? null,
    });

    if (error) {
      console.error("[activity] Gagal mencatat aktivitas:", error.message);
    }
  } catch (err) {
    console.error("[activity] Gagal mencatat aktivitas:", err instanceof Error ? err.message : err);
  }
}
