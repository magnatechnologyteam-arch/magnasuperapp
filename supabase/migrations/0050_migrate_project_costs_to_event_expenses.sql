-- Tahap C dari modul "Realisasi Event": menyatukan fitur "Biaya Proyek"
-- lama (migrasi 0017, tabel `magnative_project_costs`) ke tabel terpadu
-- `event_expenses` (migrasi 0049), sesuai keputusan Owner ("perluasan dan
-- perbarui lagi" — bukan dua sistem pencatatan biaya yang terpisah).
--
-- Data lama DIPINDAHKAN (disalin), bukan dihapus dari sumbernya — tabel
-- `magnative_project_costs` sengaja TIDAK di-drop di sini supaya riwayat
-- asli tetap ada untuk audit/rollback kalau suatu saat diperlukan. Mulai
-- migrasi ini, aplikasi TIDAK menulis ke tabel lama itu lagi:
-- `addProjectCost`/`deleteProjectCost` (src/lib/magnative/actions.ts)
-- sudah dialihkan untuk baca/tulis lewat `event_expenses`
-- (source_type = 'magnative_project'), begitu juga halaman Arus Kas
-- Proyek dan layout Magnative.
--
-- Field yang tidak ada di skema lama diisi nilai default yang ditandai
-- jelas sebagai hasil migrasi (bukan entri baru dari staf):
--   - category       -> 'Lain-lain' (skema lama tidak punya kategori)
--   - pic_name       -> nama profil `created_by` (fallback teks jelas)
--   - payment_method -> teks penanda "data migrasi"
--   - notes          -> `description` asli (supaya tidak hilang)
do $$
begin
  if not exists (
    select 1 from public.event_expenses
    where source_type = 'magnative_project'
      and payment_method = 'Tidak dicatat (migrasi dari Biaya Proyek lama)'
  ) then
    insert into public.event_expenses (
      expense_date, division, source_type, source_id, category, amount,
      pic_name, payment_method, reimbursement_status, notes,
      created_by, created_at, updated_at
    )
    select
      mpc.cost_date,
      'magnative',
      'magnative_project',
      mpc.project_id,
      'Lain-lain',
      mpc.amount,
      coalesce(nullif(p.full_name, ''), 'Tidak diketahui (migrasi lama)'),
      'Tidak dicatat (migrasi dari Biaya Proyek lama)',
      'Tidak Perlu',
      mpc.description,
      mpc.created_by,
      mpc.created_at,
      mpc.created_at
    from public.magnative_project_costs mpc
    left join public.profiles p on p.id = mpc.created_by;
  end if;
end $$;
