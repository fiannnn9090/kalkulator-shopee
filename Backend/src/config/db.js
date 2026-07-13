/**
 * Konfigurasi koneksi database MySQL menggunakan connection pool.
 * Pool dipakai (bukan single connection) agar setiap request bisa
 * mengambil koneksi secara async tanpa saling menunggu.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kalkulator_shopee',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

/**
 * Cek koneksi database saat server pertama kali dijalankan.
 * Dipanggil dari server.js supaya error konfigurasi langsung ketahuan
 * di awal, bukan saat ada request masuk.
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('[DB] Koneksi MySQL berhasil.');
        connection.release();
        return true;
    } catch (error) {
        console.error('[DB] Gagal konek ke MySQL:', error.message);
        return false;
    }
}

module.exports = { pool, testConnection };
