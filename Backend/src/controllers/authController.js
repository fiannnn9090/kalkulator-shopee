const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const userModel = require('../models/userModel');
const { createDefaultStoreForUser } = require('../models/storeModel');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Body: { username, password, namaLengkap? }
 */
const register = asyncHandler(async (req, res) => {
    const { username, password, namaLengkap } = req.body;

    if (!username || !password) {
        return fail(res, 'Username dan password wajib diisi.', 400);
    }
    if (username.length < 4) {
        return fail(res, 'Username minimal 4 karakter.', 400);
    }
    if (password.length < 6) {
        return fail(res, 'Password minimal 6 karakter.', 400);
    }

    const existing = await userModel.findByUsername(username);
    if (existing) {
        return fail(res, 'Username sudah dipakai, silakan pilih username lain.', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Pakai transaction: kalau gagal bikin toko default, user juga batal dibuat.
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO users (username, password_hash, nama_lengkap) VALUES (?, ?, ?)',
            [username, passwordHash, namaLengkap || null]
        );
        const userId = userResult.insertId;

        await createDefaultStoreForUser(userId, connection);

        await connection.commit();

        req.session.userId = userId;
        req.session.username = username;

        return success(res, { id: userId, username }, 'Registrasi berhasil.', 201);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return fail(res, 'Username dan password wajib diisi.', 400);
    }

    const user = await userModel.findByUsername(username);
    if (!user) {
        return fail(res, 'Username atau password salah.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return fail(res, 'Username atau password salah.', 401);
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    return success(res, { id: user.id, username: user.username }, 'Login berhasil.');
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return fail(res, 'Gagal logout.', 500);
        }
        res.clearCookie('connect.sid');
        return success(res, null, 'Logout berhasil.');
    });
});

/**
 * GET /api/auth/me
 * Dipakai frontend untuk cek "apakah masih login" saat buka halaman dashboard.
 */
const me = asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.session.userId);
    if (!user) {
        return fail(res, 'Sesi tidak ditemukan.', 401);
    }
    return success(res, user, 'Sesi aktif.');
});

module.exports = { register, login, logout, me };
