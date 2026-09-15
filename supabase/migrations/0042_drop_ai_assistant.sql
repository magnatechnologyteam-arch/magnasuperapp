-- Tahap 44 (permintaan Owner): fitur Asisten AI (9Router) dihapus permanen
-- dari aplikasi (halaman, Server Actions, dan tautan menu sudah dihapus
-- dari kode di commit terpisah), termasuk seluruh riwayat chat yang sempat
-- tersimpan. Migrasi ini membatalkan 0041_ai_assistant.sql.
drop table if exists public.ai_assistant_messages;
