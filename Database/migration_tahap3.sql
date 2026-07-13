-- =========================================================
-- Migrasi Tahap 3: Simpan Simulasi & History
--
-- Jalankan file ini HANYA jika kamu sudah pernah import schema.sql
-- sebelumnya (misal waktu Tahap 1/2). Kalau ini instalasi baru,
-- cukup import Database/schema.sql saja (sudah termasuk perubahan ini).
-- =========================================================

USE kalkulator_shopee;

-- Ganti nama & tipe kolom bep_unit -> bep_harga
-- (BEP di kalkulator ini berupa harga jual minimum, bukan jumlah unit)
ALTER TABLE simulations
    CHANGE COLUMN bep_unit bep_harga DECIMAL(12,2) DEFAULT NULL
    COMMENT 'harga jual minimum supaya balik modal (BEP)';
