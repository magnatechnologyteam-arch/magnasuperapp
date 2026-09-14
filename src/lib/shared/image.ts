"use client";

/**
 * Tahap 35 — kompresi foto di BROWSER sebelum diupload, khusus untuk foto
 * profil. Sebelumnya form Pengaturan menolak mentah-mentah kalau file lebih
 * besar dari 3MB ("Ukuran foto maksimal 3MB.") — terasa seperti "tidak bisa
 * disimpan" bagi staf yang upload langsung dari kamera HP, karena foto
 * kamera modern hampir selalu di atas 3MB (bisa 5-15MB), dan pesan errornya
 * cuma teks kecil di bawah form yang gampang tidak kelihatan/tidak
 * dianggap penting di layar HP yang sudah penuh.
 *
 * Daripada menaikkan batasnya, fotonya yang diperkecil dulu: digambar ke
 * <canvas> pada dimensi maksimum yang wajar untuk foto profil bulat kecil
 * (jauh di bawah resolusi kamera HP), lalu diekspor ulang sebagai JPEG
 * kualitas tinggi. Hasilnya hampir selalu di bawah 500KB apa pun ukuran
 * aslinya, jadi batas 3MB di server praktis tidak akan pernah kena lagi
 * untuk kasus normal — tapi tetap dipertahankan di server sebagai jaring
 * pengaman kalau kompresi klien gagal (browser sangat lama, dsb).
 */
const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

export async function compressAvatarImage(file: File): Promise<File> {
  // Bukan gambar rester yang bisa digambar ke canvas (mis. SVG aneh) — atau
  // browser tidak mendukung createImageBitmap — biarkan file asli lewat apa
  // adanya, biar validasi ukuran di server yang jadi jaring pengaman terakhir.
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Latar putih dulu sebelum menggambar — jaga-jaga kalau sumbernya PNG
    // transparan, supaya tidak jadi hitam waktu diekspor sebagai JPEG (JPEG
    // tidak punya kanal alpha).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    // Kalau hasil kompresinya (jarang terjadi) malah lebih besar dari
    // aslinya (mis. file asli sudah kecil & JPEG re-encode menambah
    // overhead), pakai yang asli saja.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Kompresi gagal karena alasan apa pun — jangan sampai memblokir upload,
    // biarkan file asli lewat ke validasi server seperti sebelumnya.
    return file;
  }
}
