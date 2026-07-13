const asyncHandler = require('../utils/asyncHandler');
const { success, fail } = require('../utils/response');
const { pool } = require('../config/db');
const { findDefaultStoreByUserId } = require('../models/storeModel');

/**
 * DELETE /api/account/me
 * Hapus user beserta seluruh data terkait.
 * (foreign key users->stores ON DELETE CASCADE, stores->simulations ON DELETE CASCADE)
 */
const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();

        // Logout: buang sesi
        req.session.destroy(() => {});

        res.clearCookie('connect.sid');
        return success(res, null, 'Akun berhasil dihapus.');
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
});

/**
 * DELETE /api/account/store/default
 * Hapus toko default user saja.
 */
const deleteDefaultStore = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const store = await findDefaultStoreByUserId(userId);
    if (!store) return fail(res, 'Toko default tidak ditemukan.', 404);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('DELETE FROM stores WHERE id = ? AND user_id = ?', [store.id, userId]);

        await connection.commit();

        return success(res, null, 'Toko default berhasil dihapus.');
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
});

module.exports = { deleteAccount, deleteDefaultStore };

