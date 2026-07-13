const { pool } = require('../config/db');

async function findByKode(kode) {
    if (!kode) return null;
    const [rows] = await pool.query(
        'SELECT id, kode, nama, tarif_non_star, tarif_star, tarif_mall FROM categories WHERE kode = ? LIMIT 1',
        [kode]
    );
    return rows[0] || null;
}

async function findAll() {
    const [rows] = await pool.query(
        'SELECT id, kode, nama, tarif_non_star, tarif_star, tarif_mall FROM categories ORDER BY tarif_non_star DESC'
    );
    return rows;
}

module.exports = { findByKode, findAll };
