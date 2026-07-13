const { pool } = require('../config/db');

/**
 * Dipanggil sekali saat user baru register: setiap user otomatis
 * dapat 1 toko default + 1 baris pengaturan default, supaya di
 * Tahap 3 (simpan simulasi) & Tahap 5 (pengaturan toko) tidak perlu
 * bikin flow "buat toko pertama" secara terpisah.
 */
async function createDefaultStoreForUser(userId, connection = pool) {
    const [storeResult] = await connection.query(
        'INSERT INTO stores (user_id, nama_toko, tipe_toko, is_default) VALUES (?, ?, ?, ?)',
        [userId, 'Toko Saya', 'non-star', true]
    );
    const storeId = storeResult.insertId;

    await connection.query(
        'INSERT INTO settings (store_id) VALUES (?)',
        [storeId]
    );

    return storeId;
}

async function findDefaultStoreByUserId(userId) {
    const [rows] = await pool.query(
        'SELECT id, nama_toko, tipe_toko FROM stores WHERE user_id = ? AND is_default = TRUE LIMIT 1',
        [userId]
    );
    return rows[0] || null;
}

module.exports = { createDefaultStoreForUser, findDefaultStoreByUserId };
