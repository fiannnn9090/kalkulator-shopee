const { pool } = require('../config/db');

/**
 * Semua query di sini pakai prepared statement (placeholder `?`)
 * supaya aman dari SQL Injection.
 */

async function findByUsername(username) {
    const [rows] = await pool.query(
        'SELECT id, username, password_hash, nama_lengkap, created_at FROM users WHERE username = ? LIMIT 1',
        [username]
    );
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await pool.query(
        'SELECT id, username, nama_lengkap, created_at FROM users WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0] || null;
}

async function create({ username, passwordHash, namaLengkap }) {
    const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, nama_lengkap) VALUES (?, ?, ?)',
        [username, passwordHash, namaLengkap || null]
    );
    return result.insertId;
}

module.exports = { findByUsername, findById, create };
