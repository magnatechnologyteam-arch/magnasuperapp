# Daftar Foto Pengganti Placeholder — MagnaSuperApp

Semua gambar di bawah ini **sudah dipasang di aplikasi** sebagai placeholder sementara (gradasi warna sesuai brand tiap modul + label "CONTOH / DUMMY"), bukan foto asli dan bukan hasil AI. Saat foto asli sudah ada, tinggal timpa (replace) file dengan nama yang sama persis di folder:

`public/images/placeholders/`

Tidak perlu ubah kode apa pun — nama file dijaga tetap sama supaya otomatis terganti begitu file baru diletakkan di sana.

---

## 1. Dashboard Hub — Sampul Modul

Muncul di kartu modul pada halaman utama dashboard.

| File | Modul | Foto yang dibutuhkan |
|---|---|---|
| `module-magnarent.jpg` | Magnarent | Foto gudang alat atau armada truk pengiriman Magnarent |
| `module-magnative.jpg` | Magnative | Foto tim EO saat kerja di lapangan, atau dokumentasi event |
| `module-production.jpg` | Production | Foto workshop produksi booth / suasana bengkel kerja |

Rasio: **16:9**, resolusi minimal 960×540px (semakin besar semakin baik, aplikasi otomatis menyesuaikan ukuran).

---

## 2. Magnarent → Inventaris — Galeri Kategori Alat

Muncul sebagai galeri contoh di bawah tabel inventaris.

| File | Kategori | Foto yang dibutuhkan |
|---|---|---|
| `kategori-tenda.jpg` | Tenda & Struktur | Tenda roder/sarnavil terpasang rapi di lokasi event, siang hari, sudut 3/4 |
| `kategori-sound.jpg` | Sound System | Speaker, mixer, dan kabel tersusun rapi di gudang atau saat setup panggung |
| `kategori-genset.jpg` | Genset & Power | Unit genset dan panel distribusi listrik, label kapasitas (kVA) terlihat jelas |
| `kategori-kursi.jpg` | Kursi & Meja | Susunan kursi/meja event yang bersih dan rapi, idealnya sudah tertata di venue |
| `kategori-lighting.jpg` | Lighting & Dekorasi | Lighting panggung menyala di tempat gelap agar efek cahaya terlihat |

Rasio: **16:9**.

---

## 3. Production → Proyek Booth — Dokumentasi Tahapan

Muncul sebagai galeri contoh di bawah tabel tracking proyek booth.

| File | Tahap | Foto yang dibutuhkan |
|---|---|---|
| `tahap-desain.jpg` | Desain | Screenshot mockup/render 3D desain booth sebelum produksi |
| `tahap-produksi.jpg` | Produksi | Proses pengerjaan rangka/panel booth di workshop |
| `tahap-finishing.jpg` | Finishing | Detail finishing — cat, stiker/branding, quality check |
| `tahap-instalasi.jpg` | Instalasi | Pemasangan booth di lokasi acara klien (before/after terpasang) |

Rasio: **16:9**. Idealnya tiap proyek booth punya set foto sendiri per tahap — untuk versi lanjutan (bukan sekadar contoh umum), ini butuh penyimpanan foto per-proyek yang belum dibangun (lihat catatan di bagian bawah).

---

## 4. Magnative → Ringkasan — Contoh Portofolio

Muncul sebagai galeri contoh di halaman Ringkasan Magnative.

| File | Judul | Foto yang dibutuhkan |
|---|---|---|
| `portofolio-event.jpg` | Dokumentasi Event | Suasana event yang ditangani Magnative — panggung, tamu, momen highlight |
| `portofolio-konten.jpg` | Konten Sosial Media | Behind-the-scenes shooting konten untuk klien |
| `portofolio-klien.jpg` | Showcase Klien | Logo/branding klien yang pernah ditangani (dengan izin klien) |

Rasio: **16:9**.

---

## Cara mengganti foto (untuk tim di kantor)

1. Siapkan foto asli, simpan dengan nama file **persis sama** seperti tabel di atas (mis. `kategori-tenda.jpg`).
2. Ganti file lama di folder `public/images/placeholders/` dengan file baru tersebut.
3. Commit & push ke GitHub (`git add`, `git commit`, `git push`) — Vercel akan otomatis build ulang dan foto baru langsung tayang di web dalam 1–2 menit.
4. Kalau foto barunya format `.png` atau `.webp`, beri tahu saya (Claude) supaya kode pemanggilnya ikut disesuaikan — saat ini semua mengarah ke `.jpg`.

## Catatan pengembangan lanjutan (belum dikerjakan, untuk nanti)

Placeholder saat ini bersifat **umum per kategori/tahap** (bukan per-alat atau per-proyek spesifik), dan disimpan sebagai file statis — belum tersimpan di database. Kalau nanti dibutuhkan:
- foto berbeda untuk **tiap unit alat** di Inventaris (bukan cuma per kategori), atau
- foto progres berbeda untuk **tiap proyek booth** (bukan cuma per tahap secara umum),

itu perlu penyimpanan file (Supabase Storage) + kolom URL foto di database, dan fitur upload dari form Tambah/Edit. Ini pengembangan terpisah yang bisa dikerjakan setelah foto-foto dummy di atas diganti foto asli.
