const { pool } = require('../config/db');

const SORTABLE_COLUMNS = {
    created_at: 'created_at',
    harga_jual: 'harga_jual',
    margin_persen: 'margin_persen',
    profit_bersih: 'profit_bersih',
    nama_produk: 'nama_produk'
};

async function create(userId, storeId, payload) {
    const [result] = await pool.query(
        `INSERT INTO simulations (
            user_id, store_id, category_id, nama_produk, mode,
            harga_modal, target_profit_type, target_profit_value, harga_jual,
            biaya_admin, biaya_proses_pesanan, biaya_promo_json,
            profit_kotor, profit_bersih, margin_persen, roi_persen, bep_harga,
            status_warning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId, storeId, payload.categoryId || null, payload.namaProduk, payload.mode,
            payload.hargaModal, payload.targetProfitType || null, payload.targetProfitValue || null, payload.hargaJual,
            payload.biayaAdmin || 0, payload.biayaProsesPesanan || 0, JSON.stringify(payload.biayaPromo || {}),
            payload.profitKotor || 0, payload.profitBersih || 0, payload.marginPersen || 0, payload.roiPersen || 0, payload.bepHarga || null,
            payload.statusWarning || 'aman'
        ]
    );
    return result.insertId;
}

async function findAllByUser(userId, { q, status, sort = 'created_at', dir = 'desc', limit = 50, offset = 0 } = {}) {
    const sortColumn = SORTABLE_COLUMNS[sort] || 'created_at';
    const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['user_id = ?'];
    const params = [userId];

    if (q) {
        conditions.push('nama_produk LIKE ?');
        params.push(`%${q}%`);
    }
    if (status) {
        conditions.push('status_warning = ?');
        params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // sortColumn dan sortDir tidak berasal langsung dari input mentah (sudah divalidasi
    // lewat whitelist SORTABLE_COLUMNS di atas), jadi aman untuk disisipkan ke query.
    const [rows] = await pool.query(
        `SELECT id, nama_produk, mode, harga_modal, harga_jual, margin_persen, roi_persen,
                profit_bersih, status_warning, created_at
         FROM simulations
         WHERE ${whereClause}
         ORDER BY ${sortColumn} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM simulations WHERE ${whereClause}`,
        params
    );

    return { rows, total };
}

async function findById(id, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM simulations WHERE id = ? AND user_id = ? LIMIT 1',
        [id, userId]
    );
    return rows[0] || null;
}

async function update(id, userId, payload) {
    const [result] = await pool.query(
        `UPDATE simulations SET
            category_id = ?, nama_produk = ?, mode = ?,
            harga_modal = ?, target_profit_type = ?, target_profit_value = ?, harga_jual = ?,
            biaya_admin = ?, biaya_proses_pesanan = ?, biaya_promo_json = ?,
            profit_kotor = ?, profit_bersih = ?, margin_persen = ?, roi_persen = ?, bep_harga = ?,
            status_warning = ?
         WHERE id = ? AND user_id = ?`,
        [
            payload.categoryId || null, payload.namaProduk, payload.mode,
            payload.hargaModal, payload.targetProfitType || null, payload.targetProfitValue || null, payload.hargaJual,
            payload.biayaAdmin || 0, payload.biayaProsesPesanan || 0, JSON.stringify(payload.biayaPromo || {}),
            payload.profitKotor || 0, payload.profitBersih || 0, payload.marginPersen || 0, payload.roiPersen || 0, payload.bepHarga || null,
            payload.statusWarning || 'aman',
            id, userId
        ]
    );
    return result.affectedRows > 0;
}

async function remove(id, userId) {
    const [result] = await pool.query(
        'DELETE FROM simulations WHERE id = ? AND user_id = ?',
        [id, userId]
    );
    return result.affectedRows > 0;
}

async function getDashboardSummary(userId) {
    const [[summary]] = await pool.query(
        `SELECT
            COUNT(*) AS total_simulasi,
            COALESCE(SUM(profit_bersih), 0) AS total_profit,
            COALESCE(AVG(margin_persen), 0) AS rata_rata_margin
         FROM simulations WHERE user_id = ?`,
        [userId]
    );
    return summary;
}

/**
 * Produk dengan profit bersih tertinggi milik user (untuk kartu
 * "Produk dengan Profit Tertinggi" di dashboard).
 */
async function findTopProfit(userId) {
    const [rows] = await pool.query(
        `SELECT id, nama_produk, profit_bersih, margin_persen, created_at
         FROM simulations
         WHERE user_id = ?
         ORDER BY profit_bersih DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

/**
 * Simulasi paling baru milik user (untuk kartu "Simulasi Terakhir").
 */
async function findLatest(userId) {
    const [rows] = await pool.query(
        `SELECT id, nama_produk, profit_bersih, margin_persen, status_warning, created_at
         FROM simulations
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

/**
 * Data untuk grafik Profit & Margin: N simulasi terbaru, diurutkan
 * dari yang paling lama ke paling baru supaya grafiknya "maju ke kanan".
 */
async function findChartData(userId, limit = 10) {
    const [rows] = await pool.query(
        `SELECT id, nama_produk, profit_bersih, margin_persen, created_at
         FROM (
             SELECT id, nama_produk, profit_bersih, margin_persen, created_at
             FROM simulations
             WHERE user_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT ?
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [userId, Number(limit)]
    );
    return rows;
}

module.exports = {
    create, findAllByUser, findById, update, remove,
    getDashboardSummary, findTopProfit, findLatest, findChartData
};