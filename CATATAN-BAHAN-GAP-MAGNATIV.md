# Catatan: Bahan/Keputusan yang Diperlukan — Gap Magnativ

> Status: **DITUNDA** — menunggu keputusan Owner. Jangan mulai coding item
> di bawah sebelum ada keputusan/bahan yang sesuai. Begitu salah satu item
> punya jawaban, bisa langsung dikerjakan satu-satu (tidak perlu tunggu
> semua lengkap).

Konteks: hasil audit gap Magnativ vs aplikasi EO/creative-agency eksternal
(HoneyBook, Dubsado, 17hats, Bonsai, Planable, Buffer, Sprout Social, dll).
3 gap prioritas menengah yang tidak butuh bahan eksternal (task proyek,
database vendor, komentar/proofing aset kreatif) **sudah selesai dibangun**
— lihat commit `f35e7e1`. Catatan ini khusus untuk 4 gap yang masih
menunggu Owner.

---

## 1. Proposal & Kontrak Digital (Prioritas Tinggi)

**Yang dibutuhkan dari Owner:**
- Template proposal resmi Magnativ yang sudah dipakai sekarang (format
  Word/PDF/Canva yang biasa dikirim ke klien) — untuk acuan struktur data
  (bagian mana yang variabel: harga, timeline, item, dst.)
- Template kontrak/SPK (Surat Perjanjian Kerja) resmi yang biasa dipakai,
  termasuk klausul standar (pembayaran, pembatalan, force majeure, dsb.)
- **Keputusan tanda tangan digital**: pakai layanan e-signature berbayar
  (mis. PrivyID, Meterai Elektronik Peruri, DocuSign) supaya kontrak sah
  secara hukum di Indonesia, atau cukup upload PDF hasil tanda tangan
  manual/scan?
  - Kalau pakai layanan berbayar → perlu budget bulanan/per-dokumen +
    akun bisnis di layanan tsb.
- Nomor rekening/info pembayaran yang mau dicantumkan otomatis di setiap
  proposal/kontrak (kalau mau auto-generate)

---

## 2. Publikasi & Data Media Sosial Nyata (Prioritas Tinggi)

**Yang dibutuhkan dari Owner:**
- Akses akun bisnis media sosial klien yang mau dipantau/dipublikasi
  lewat sistem (Instagram Business, TikTok Business, dll.) — biasanya
  lewat login admin/Business Manager per klien
- **Keputusan arsitektur**:
  - Opsi A — integrasi langsung ke Meta Graph API / TikTok API (perlu App
    Review dari Meta/TikTok, prosesnya bisa 2-4 minggu, gratis tapi butuh
    effort teknis)
  - Opsi B — pakai pihak ketiga (Buffer, Publer, Metricool, dll.) yang
    sudah punya API siap pakai — lebih cepat setup tapi ada biaya
    langganan bulanan per akun
- Budget bulanan untuk opsi yang dipilih (Opsi B kisaran $10-50/akun/bulan
  tergantung provider)
- Siapa yang akan jadi admin akun-akun sosmed klien tsb di sistem
  (role/akses)

---

## 3. Portal Klien Self-Service (Prioritas Tinggi)

**Yang dibutuhkan dari Owner:**
- **Keputusan scope**: klien boleh lihat/lakukan apa saja di portalnya
  sendiri? Contoh opsi:
  - Read-only: lihat status proyek, invoice, approve konten/desain
  - Interactive: klien bisa comment/request revisi langsung, approve
    pembayaran, download aset final
- **Keputusan metode login klien**:
  - Email + password terpisah dari akun staff (perlu tabel user klien
    baru + alur reset password/lupa password)
  - Magic link via email/WhatsApp (tanpa password, lebih simpel tapi
    butuh WhatsApp Business API atau email service)
- Kalau mau notifikasi WhatsApp otomatis ke klien → perlu akun WhatsApp
  Business API (berbayar, provider mis. Qontak/Mekari/Twilio)

---

## 4. Payment Gateway Online (Prioritas Menengah)

**Yang dibutuhkan dari Owner:**
- **Keputusan provider**: Midtrans, Xendit, atau lainnya (bisa dibantu
  riset perbandingan fitur & fee lebih lanjut kalau perlu)
- **Status merchant account**: sudah punya akun merchant di salah satu
  provider tsb, atau perlu daftar dari nol? (Proses verifikasi bisnis
  biasanya perlu NPWP, akta perusahaan, rekening bisnis — bisa makan
  waktu beberapa hari kerja)
- Rekening bank tujuan settlement dana dari payment gateway
- Preferensi metode pembayaran yang mau diaktifkan untuk klien (transfer
  bank VA, QRIS, kartu kredit, e-wallet, dll.) — masing-masing ada fee
  berbeda dari provider
