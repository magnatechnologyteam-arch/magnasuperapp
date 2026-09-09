# Analisis Fitur Referensi & Evaluasi MagnaSuperApp

*Bahan implementasi — dibandingkan dengan Booqable/EZRentOut (rental), HoneyBook/Dubsado (CRM event/agency), dan Accurate/Mekari Jurnal/Zahir/Kledo (akuntansi), plus Odoo sebagai referensi arsitektur ERP modular.*

## 1. Fitur referensi yang relevan untuk tiap modul

### Magnarent (sewa alat) — dari Booqable & EZRentOut

- **Kalender ketersediaan visual (drag-and-drop)** — booking digambar sebagai blok di kalender per alat, bukan cuma daftar tanggal di tabel. Langsung kelihatan bentrok jadwal tanpa harus cek manual.
- **Tracking per UNIT fisik, bukan cuma jumlah agregat** — tiap unit alat punya ID/kode/barcode sendiri (mis. "Tenda Roder #3"), jadi ketahuan persis unit mana yang sedang disewa, mana yang maintenance, mana yang rusak. Inventaris Magnarent saat ini baru hitung agregat per kategori.
- **Barcode/QR scan saat serah-terima** — staf gudang scan barcode alat saat keluar dan saat kembali, otomatis update status tanpa input manual.
- **Notifikasi otomatis keterlambatan pengembalian** — alert ke staf (dan opsional ke klien) kalau alat belum dikembalikan padahal tanggal sewa sudah lewat.
- **Deposit/jaminan kerusakan tercatat terpisah** dari harga sewa, dengan status refund.

### Magnativ (EO/creative agency) — dari HoneyBook & Dubsado

- **Kontrak digital + tanda tangan elektronik** — klien tanda tangan kontrak langsung dari link, tidak perlu cetak/scan manual.
- **Portal klien (client portal)** — klien punya akses terbatas untuk lihat status proyeknya sendiri, invoice, dan approve proposal, tanpa perlu staf kirim update manual satu-satu.
- **Automated follow-up sequence** — reminder otomatis terjadwal ke klien (mis. "invoice jatuh tempo 3 hari lagi", "proposal belum di-approve") tanpa staf harus ingat kirim manual.
- **Proposal/quotation builder dengan template** — bikin proposal visual (bukan cuma dokumen teks) yang bisa langsung disetujui klien secara online.

### Keuangan — dari Accurate, Mekari Jurnal, Zahir, Kledo

- **Pembukuan double-entry sungguhan** — jurnal umum, buku besar, neraca, laba rugi otomatis dari setiap transaksi, bukan cuma ringkasan piutang seperti sekarang.
- **Rekonsiliasi bank otomatis** — impor mutasi rekening, dicocokkan otomatis dengan transaksi yang tercatat.
- **Perhitungan pajak otomatis** (PPN 11%, PPh) langsung di invoice/laporan, termasuk e-Faktur untuk yang butuh.
- **Multi-termin pembayaran** — DP tercatat sebagai nominal (bukan cuma label status "DP"), sehingga sisa tagihan riil kelihatan, bukan nilai penuh seperti keterbatasan yang sudah dicatat jujur di halaman Piutang & Pendapatan saat ini.

### Arsitektur keseluruhan — dari Odoo

- **Modul Purchasing/PO terhubung stok** — pembelian material dari supplier otomatis menambah stok begitu diterima, dengan approval berjenjang.
- **Bill of Materials (BOM)** untuk Production — resep material per jenis booth, jadi begitu proyek booth dibuat, kebutuhan material langsung terhitung dan otomatis mengurangi stok, bukan dicatat manual di kolom `materials` seperti sekarang.

## 2. Kelebihan MagnaSuperApp saat ini

- **Satu sistem lintas 3 lini bisnis** dengan data klien terpadu (Klien Terpadu) — booking Magnarent, proyek Magnativ, dan proyek Production bisa merujuk ke klien yang sama. Ini justru sesuatu yang TIDAK dimiliki kombinasi Booqable+HoneyBook+Accurate terpisah — kalau pakai software SaaS-nya masing-masing, data klien akan terpecah di 3 sistem berbeda.
- **Akses berbasis divisi (RLS) yang rapi** — staf satu divisi otomatis tidak bisa lihat data divisi lain, diatur di level database, bukan cuma di tampilan UI.
- **Audit trail (log aktivitas)** bawaan, tanpa biaya tambahan — di banyak SaaS ini fitur premium/add-on berbayar.
- **API terbuka untuk automation sendiri** (Katalog Produk, Faktur) — bisa disambungkan ke n8n/tools apa pun sesuai kebutuhan, tidak terkunci ke satu vendor.
- **Biaya jangka panjang jauh lebih murah** — sekali dibangun, tidak ada biaya per-user/bulan seperti Accurate (mulai ~Rp 200-400rb/bulan), HoneyBook (~$36-66/bulan), atau Booqable (~$49-plus/bulan) — apalagi kalau ketiganya dipakai sekaligus untuk 3 lini bisnis berbeda.
- **Bisa terus disesuaikan** persis kebutuhan Magna Technology — sudah terbukti dari kecepatan menambah Katalog Produk dan Faktur sesuai permintaan owner langsung, sesuatu yang tidak mungkin dilakukan ke software SaaS pihak ketiga.

## 3. Kekurangan MagnaSuperApp dibanding referensi

- **Belum ada tracking unit fisik individual** di Inventaris Magnarent — baru agregat per kategori alat, belum per unit dengan barcode.
- **Belum ada portal klien eksternal** — semua fitur saat ini staf-only, klien tidak bisa login lihat status/invoice sendiri seperti di HoneyBook.
- **Belum ada kontrak digital & tanda tangan elektronik.**
- **Belum ada follow-up/reminder otomatis terjadwal** ke klien (baru ada kirim invoice manual/WA on-demand, belum ada urutan reminder otomatis).
- **Bukan pembukuan akuntansi sungguhan** — Piutang & Pendapatan itu ringkasan kas, bukan jurnal umum/neraca/laba rugi yang diakui standar akuntansi, dan DP masih berupa label status, bukan nominal riil yang tercatat.
- **Belum ada modul pembelian/PO** — pengurangan stok material Production masih manual, belum otomatis dari pembelian yang diterima.
- **Belum ada notifikasi email**, hanya push notification PWA — sebagian orang lebih terbiasa cek email untuk hal formal seperti invoice.
- **Role masih dua level saja** (per-divisi vs akses penuh) — belum ada level "manager divisi" vs "staf biasa" dalam satu divisi yang sama.
- **Bukan aplikasi mobile native** — PWA cukup baik tapi beberapa fitur native (notifikasi yang lebih andal, ikon di app store) tidak sekuat aplikasi native asli.

## 4. Rekomendasi prioritas (kalau mau lanjut implementasi)

Diurutkan dari yang paling murah/cepat dibangun dengan dampak besar, ke yang paling besar scope-nya:

1. **DP sebagai nominal riil** (bukan cuma label status) di Magnarent/Magnativ/Production — perubahan kecil ke skema yang sudah ada, langsung bikin angka Piutang & Pendapatan akurat.
2. **Tracking unit fisik + barcode sederhana** di Inventaris Magnarent — value tinggi untuk operasional gudang sehari-hari.
3. **Reminder otomatis jatuh tempo invoice** — tinggal tambah scheduled job yang cek `due_date` invoice dan kirim WA otomatis (infrastruktur webhook n8n-nya sudah ada dari fitur Faktur).
4. **Modul Purchasing/PO ringan** terhubung ke stok Material Production & Inventaris Magnarent.
5. **Portal klien eksternal** — scope besar (perlu sistem login terpisah untuk klien), tapi paling besar dampaknya ke citra profesional ke klien.
6. **Pembukuan akuntansi penuh** (jurnal umum, neraca, laba rugi) — scope paling besar, kemungkinan besar lebih efisien tetap pakai Accurate/Mekari Jurnal untuk ini dan cukup SINKRON datanya dari MagnaSuperApp (lewat API), daripada membangun ulang mesin akuntansi dari nol.

---
*Disusun berdasarkan riset fitur publik Booqable, EZRentOut, HoneyBook, Dubsado, Accurate, Mekari Jurnal, Zahir, Kledo, dan Odoo (September 2026), dibandingkan dengan kondisi MagnaSuperApp saat ini (modul Magnarent, Magnativ, Production, dan Admin: Kelola Pengguna, Laporan, Aktivitas, Klien Terpadu, Piutang & Pendapatan, Katalog Produk, Faktur).*
