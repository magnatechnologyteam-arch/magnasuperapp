# Roadmap "Naik Kelas" MagnaSuperApp

Hasil audit menyeluruh ke seluruh aplikasi (37 halaman, 58 komponen, 42 file
library, 19 migrasi database) untuk permintaan: *"modifikasi keseluruhan
fitur dan fungsi, perbarui seperti aplikasi profesional yang berjalan."*

Kesimpulan audit: **fondasinya sudah cukup solid** — alur CRUD di semua
modul lengkap (tambah/edit/hapus semua ada), aksi berbahaya (hapus) sudah
dijaga konfirmasi, dan banyak aturan bisnis penting sudah ditangani dengan
baik (mis. tidak bisa hapus alat yang masih dibooking, tidak bisa hapus
pengajuan modal yang sudah diputuskan investor). Yang bikin terasa "belum
sekelas aplikasi profesional" itu lebih ke arah:

1. Tidak ada jaring pengaman kalau ada error/halaman lambat (layar putih
   kosong kalau ada masalah, bukan pesan yang enak dilihat).
2. Ada beberapa hal yang ditulis berulang-ulang di banyak file (warna
   badge status, menu Admin/Investor) — bukan bug, tapi rawan jadi tidak
   sinkron kalau salah satu lupa diperbarui.
3. Semua query database ambil SEMUA baris tanpa batas — aman sekarang
   (datanya masih sedikit), tapi makin lambat kalau data sudah ribuan
   baris (booking, invoice, log aktivitas).
4. Karena tidak ada proses testing otomatis sebelum deploy (setiap
   perubahan langsung dari saya → Anda push → langsung tayang ke
   pengguna), perlu jaring pengaman tambahan di proses deploy-nya sendiri.

Supaya risiko tetap kecil (sudah kejadian sekali kemarin ada bug lolos ke
production), perbaikan ini akan dikerjakan **bertahap** — pola yang sama
seperti Tahap 1-11 sebelumnya — bukan sekaligus dalam satu commit raksasa.

---

## Tahap 12 — Jaring pengaman & rapikan yang berulang (SEDANG DIKERJAKAN)

Risiko paling rendah, dampak paling terasa. Semua item ini murah untuk
saya kerjakan dan tidak mengubah cara kerja fitur yang sudah ada:

- **Cek otomatis sebelum deploy** — tambah 1 file GitHub Actions yang
  otomatis mengecek kode Anda (`next build` + cek tipe TypeScript) setiap
  kali di-push, SEBELUM Vercel benar-benar men-deploy-nya. Ini jaring
  pengaman supaya bug seperti kemarin (fungsi yang salah dilewatkan ke
  komponen) bisa ketahuan lebih awal.
- **Halaman error/lambat yang lebih enak dilihat** — sekarang kalau ada
  error atau halaman lambat dimuat, yang muncul cuma layar putih kosong.
  Ditambahkan halaman "Terjadi kesalahan, coba lagi" dan indikator
  loading yang branded di setiap modul.
- **Tutup celah kecil pesan error mentah** — 2 tempat (notifikasi push,
  hapus staf) sempat menampilkan pesan error database mentah ke layar;
  diseragamkan seperti modul lain yang sudah rapi.
- **Satukan daftar menu Admin/Investor** — sekarang menu di Sidebar
  (tampilan laptop) dan Menu Bawah (tampilan HP) ditulis dua kali
  terpisah — kalau nambah menu baru dan lupa update salah satu, tampilan
  HP & laptop bisa beda sendiri. Disatukan jadi satu sumber.

## Tahap 13 — Rapikan kode yang berulang (belum dikerjakan)

- Satukan warna badge status (Menunggu/Disetujui/Lunas/dst) yang saat ini
  ditulis ulang di 14 file berbeda jadi satu file bersama — supaya kalau
  suatu saat mau ganti skema warna, cukup ubah satu tempat.
- Ganti 2 tempat yang masih pakai kotak konfirmasi bawaan browser
  (`window.confirm`, tampilannya polos & beda dari kotak konfirmasi
  aplikasi) ke komponen konfirmasi yang sudah dipakai di 13 tempat lain.

## Tahap 14 — Batasi query yang bisa membengkak (belum dikerjakan)

- Tambah batas jumlah data yang diambil sekaligus untuk tabel yang
  paling berpotensi tumbuh besar (booking, invoice, log aktivitas) —
  supaya halaman tetap cepat dibuka walau datanya sudah ribuan baris ke
  depannya. Langkah awal aman (kasih batas 200 baris terbaru), langkah
  lanjutan (halaman 1/2/3/dst di tabel) menyusul kalau memang mulai
  kerasa perlu.

## Tahap 15+ — Perbaikan besar (didiskusikan dulu sebelum dikerjakan)

Ini butuh keputusan/diskusi dulu karena dampaknya lebih luas atau makan
waktu lebih lama:

- **Pencarian lintas modul** — sekarang tiap halaman punya pencarian
  sendiri-sendiri (klien, invoice, booking, dst berbeda kotak pencarian).
  Bikin satu pencarian global lintas semua modul itu proyek cukup besar
  (perlu index pencarian di database) — worth dibahas kalau memang
  kepakai sehari-hari.
- Halaman-halaman besar (mis. pengelola Booth Project ~750 baris kode)
  bisa dipecah jadi komponen lebih kecil supaya lebih gampang dirawat ke
  depannya — ini murni soal kerapian kode di belakang layar, tidak
  mengubah tampilan/fungsi sama sekali buat Anda.

---

Saya mulai dari **Tahap 12** sekarang. Setiap tahap tetap saya verifikasi
lewat log server Vercel + saya coba langsung sebelum lapor selesai, sama
seperti proses sebelumnya.
