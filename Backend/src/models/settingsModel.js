const { pool } = require('../config/db');

/**
 * Ambil store default + settings-nya untuk user.
 */
async function getSettingsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT 
            s.id AS store_id,
            s.nama_toko,
            s.tipe_toko,
            st.id AS settings_id,
            st.kategori_default_id,
            st.biaya_proses_pesanan,
            st.voucher_default_persen,
            st.ongkir_gratis_ongkir_xtra,
            st.cashback_xtra,
            st.video_xtra,
            st.live_xtra,
            st.asuransi_pengiriman,
            st.margin_minimum_persen,
            st.updated_at
         FROM stores s
         LEFT JOIN settings st ON st.store_id = s.id
         WHERE s.user_id = ? AND s.is_default = TRUE
         LIMIT 1`,
        [userId]
    );

    const row = rows[0];
    if (!row) return null;

    // settings bisa saja null (kalau data lama belum dibuat), jadi normalisasi.
    return {
        store: {
            id: row.store_id,
            nama_toko: row.nama_toko,
            tipe_toko: row.tipe_toko
        },
        settings: {
            kategoriDefaultId: row.kategori_default_id ?? null,
            biayaProsesPesanan: Number(row.biaya_proses_pesanan) || 0,
            voucherDefaultPersen: Number(row.voucher_default_persen) || 0,
            ongkirGratisOngkirXtra: !!row.ongkir_gratis_ongkir_xtra,
            cashbackXtra: !!row.cashback_xtra,
            videoXtra: !!row.video_xtra,
            liveXtra: !!row.live_xtra,
            asuransiPengiriman: !!row.asuransi_pengiriman,
            marginMinimumPersen: Number(row.margin_minimum_persen) || 0,
            updatedAt: row.updated_at
        }
    };
}

/**
 * Update nama toko & beberapa default settings.
 */
async function updateStoreAndSettingsByUserId(userId, payload, connection = pool) {
    const storeUpdate = {
        nama_toko: payload.namaToko
    };

    const settingsUpdate = {
        biaya_proses_pesanan: payload.biayaProsesPesanan,
        voucher_default_persen: payload.voucherDefaultPersen,
        ongkir_gratis_ongkir_xtra: payload.ongkirGratisOngkirXtra
    };

    const [storeRows] = await connection.query(
        'SELECT id FROM stores WHERE user_id = ? AND is_default = TRUE LIMIT 1',
        [userId]
    );

    const store = storeRows[0];
    if (!store) return false;

    const storeId = store.id;

    // Pastikan settings row ada.
    await connection.query(
        'INSERT INTO settings (store_id) VALUES (?) ON DUPLICATE KEY UPDATE store_id = store_id',
        [storeId]
    );

    await connection.query(
        'UPDATE stores SET nama_toko = ? WHERE id = ?',
        [storeUpdate.nama_toko, storeId]
    );

    await connection.query(
        `UPDATE settings SET
            biaya_proses_pesanan = ?,
            voucher_default_persen = ?,
            ongkir_gratis_ongkir_xtra = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE store_id = ?`,
        [
            settingsUpdate.biaya_proses_pesanan,
            settingsUpdate.voucher_default_persen,
            settingsUpdate.ongkir_gratis_ongkir_xtra,
            storeId
        ]
    );

    return true;
}

module.exports = {
    getSettingsByUserId,
    updateStoreAndSettingsByUserId
};

