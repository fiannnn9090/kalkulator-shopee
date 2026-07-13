-- =========================================================
-- Kalkulator Pintar Profit Shopee Indonesia
-- Database Schema (MySQL)
--
-- Skema ini disiapkan untuk SELURUH tahap pengembangan
-- (login, kalkulator, history, dashboard, pengaturan toko)
-- agar tidak perlu ALTER TABLE berkali-kali di tahap berikutnya.
-- Tabel yang belum dipakai di tahap awal tetap dibuat, tapi
-- baru diisi/dipakai backend-nya secara bertahap.
-- =========================================================

CREATE DATABASE IF NOT EXISTS kalkulator_shopee
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kalkulator_shopee;

-- ---------------------------------------------------------
-- 1. users
--    Akun login seller (username + password, tanpa OAuth/JWT)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. stores
--    Profil toko milik seorang user (1 user bisa >1 toko)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nama_toko VARCHAR(100) NOT NULL,
    tipe_toko ENUM('non-star', 'star', 'mall') NOT NULL DEFAULT 'non-star',
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. categories
--    Master kategori & tarif admin Shopee (seed dari SHOPEE_DB
--    yang sudah ada di script.js, supaya frontend & backend sinkron)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(30) NOT NULL UNIQUE,       -- contoh: rate_1000, rate_950, dst
    nama VARCHAR(100) NOT NULL,
    tarif_non_star DECIMAL(5,2) NOT NULL,
    tarif_star DECIMAL(5,2) NOT NULL,
    tarif_mall DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. settings
--    Pengaturan default per toko: biaya admin, voucher, ongkir, dll.
--    Dipakai agar user tidak perlu input ulang setiap simulasi.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    kategori_default_id INT DEFAULT NULL,
    biaya_proses_pesanan DECIMAL(10,2) NOT NULL DEFAULT 1250,
    voucher_default_persen DECIMAL(5,2) NOT NULL DEFAULT 0,
    ongkir_gratis_ongkir_xtra BOOLEAN NOT NULL DEFAULT FALSE,
    cashback_xtra BOOLEAN NOT NULL DEFAULT FALSE,
    video_xtra BOOLEAN NOT NULL DEFAULT FALSE,
    live_xtra BOOLEAN NOT NULL DEFAULT FALSE,
    asuransi_pengiriman BOOLEAN NOT NULL DEFAULT FALSE,
    margin_minimum_persen DECIMAL(5,2) NOT NULL DEFAULT 10,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (kategori_default_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 5. simulations (sekaligus berfungsi sebagai "history")
--    Setiap kali user menghitung & menyimpan, satu baris masuk sini.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    store_id INT NOT NULL,
    category_id INT DEFAULT NULL,
    nama_produk VARCHAR(150) NOT NULL,
    mode TINYINT NOT NULL COMMENT '1 = hitung harga jual dari target profit, 2 = cek profit dari harga pasar',

    harga_modal DECIMAL(12,2) NOT NULL,
    target_profit_type ENUM('persen', 'nominal') DEFAULT NULL,
    target_profit_value DECIMAL(12,2) DEFAULT NULL,
    harga_jual DECIMAL(12,2) NOT NULL,

    biaya_admin DECIMAL(12,2) NOT NULL DEFAULT 0,
    biaya_proses_pesanan DECIMAL(12,2) NOT NULL DEFAULT 0,
    biaya_promo_json JSON DEFAULT NULL COMMENT 'rincian biaya voucher/cashback/ongkir/konten yang dipilih',

    profit_kotor DECIMAL(12,2) NOT NULL DEFAULT 0,
    profit_bersih DECIMAL(12,2) NOT NULL DEFAULT 0,
    margin_persen DECIMAL(6,2) NOT NULL DEFAULT 0,
    roi_persen DECIMAL(6,2) NOT NULL DEFAULT 0,
    bep_harga DECIMAL(12,2) DEFAULT NULL COMMENT 'harga jual minimum supaya balik modal (BEP)',

    status_warning ENUM('aman', 'margin_rendah', 'harga_terlalu_rendah', 'profit_sangat_kecil') NOT NULL DEFAULT 'aman',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_simulations_user (user_id),
    INDEX idx_simulations_created (created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Seed data: kategori & tarif (persis dari SHOPEE_DB di script.js)
-- ---------------------------------------------------------
INSERT INTO categories (kode, nama, tarif_non_star, tarif_star, tarif_mall) VALUES
    ('rate_1000', 'Tarif 10.0%', 10.00, 10.00, 12.50),
    ('rate_950',  'Tarif 9.5%',   9.50,  9.50, 11.50),
    ('rate_900',  'Tarif 9.0%',   9.00,  9.00, 11.00),
    ('rate_825',  'Tarif 8.25%',  8.25,  8.25, 10.00),
    ('rate_675',  'Tarif 6.75%',  6.75,  6.75,  8.50),
    ('rate_650',  'Tarif 6.5%',   6.50,  6.50,  8.00),
    ('rate_525',  'Tarif 5.25%',  5.25,  5.25,  7.00),
    ('rate_425',  'Tarif 4.25%',  4.25,  4.25,  5.50),
    ('rate_250',  'Tarif 2.5%',   2.50,  2.50,  3.50)
ON DUPLICATE KEY UPDATE nama = VALUES(nama);
