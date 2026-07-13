-- =========================================================
-- Shopee Dataset 2026 (struktur data tarif)
-- =========================================================
-- Catatan:
-- Anda mengusulkan struktur tabel yang lebih datar:
--  id, category, subcategory, product, fee_admin, fee_affiliate, fee_xtra, cod_fee, slug, keywords
-- Saya implementasikan struktur tersebut dalam 1 tabel supaya:
-- - seed data resmi bisa langsung diimpor (CSV/SQL)
-- - endpoint autocomplete bisa mencari dengan slug/keywords
-- - perhitungan adminPct langsung mengambil fee_admin per baris sesuai status
--
-- Jalankan file ini SETELAH schema.sql agar database kalkulator_shopee sudah ada.
-- =========================================================

USE kalkulator_shopee;

CREATE TABLE IF NOT EXISTS shopee_dataset_2026 (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- label hirarki
    category VARCHAR(120) NOT NULL,
    subcategory VARCHAR(140) NOT NULL,
    product VARCHAR(200) NOT NULL,

    -- tarif/fee (simpan sebagai persen; sesuaikan angka dataset asli)
    fee_admin DECIMAL(7,3) NOT NULL DEFAULT 0,        -- Non-star/admin fee utama
    fee_affiliate DECIMAL(7,3) NOT NULL DEFAULT 0,    -- Star fee (jika dataset memisahkan)
    fee_xtra DECIMAL(7,3) NOT NULL DEFAULT 0,         -- XTRA (opsional, jika Anda pakai untuk kampanye tertentu)
    cod_fee DECIMAL(7,3) NOT NULL DEFAULT 0,         -- COD fee (opsional)

    -- helper pencarian
    slug VARCHAR(200) DEFAULT NULL,
    keywords TEXT DEFAULT NULL,

    -- status seller tarif
    tarif_non_star DECIMAL(7,3) NOT NULL DEFAULT 0,
    tarif_star DECIMAL(7,3) NOT NULL DEFAULT 0,
    tarif_mall DECIMAL(7,3) NOT NULL DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_shopee_dataset_search (category, subcategory, product),
    FULLTEXT INDEX idx_shopee_dataset_keywords (keywords)
) ENGINE=InnoDB;


