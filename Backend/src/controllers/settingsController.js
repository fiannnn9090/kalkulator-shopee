const asyncHandler = require('../utils/asyncHandler');
const { success, fail } = require('../utils/response');
const { pool } = require('../config/db');
const {
    getSettingsByUserId,
    updateStoreAndSettingsByUserId
} = require('../models/settingsModel');

// GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const data = await getSettingsByUserId(userId);
    if (!data) return fail(res, 'Toko default tidak ditemukan.', 404);
    return success(res, data);
});

// PUT /api/settings
// payload: { namaToko, biayaProsesPesanan, voucherDefaultPersen, ongkirGratisOngkirXtra }
const putSettings = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const {
        namaToko,
        biayaProsesPesanan,
        voucherDefaultPersen,
        ongkirGratisOngkirXtra
    } = req.body || {};

    if (!namaToko || typeof namaToko !== 'string' || !namaToko.trim()) {
        return fail(res, 'Nama toko wajib diisi.', 400);
    }

    const biaya = Number(biayaProsesPesanan);
    if (!Number.isFinite(biaya) || biaya < 0) {
        return fail(res, 'Biaya admin default (biaya proses pesanan) tidak valid.', 400);
    }

    const voucher = Number(voucherDefaultPersen);
    if (!Number.isFinite(voucher) || voucher < 0 || voucher > 100) {
        return fail(res, 'Voucher default persen tidak valid (0-100).', 400);
    }

    const ongkirFlag = !!ongkirGratisOngkirXtra;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const ok = await updateStoreAndSettingsByUserId(
            userId,
            {
                namaToko: namaToko.trim(),
                biayaProsesPesanan: biaya,
                voucherDefaultPersen: voucher,
                ongkirGratisOngkirXtra: ongkirFlag
            },
            connection
        );

        if (!ok) return fail(res, 'Toko default tidak ditemukan.', 404);

        await connection.commit();

        const data = await getSettingsByUserId(userId);
        return success(res, data, 'Pengaturan berhasil diperbarui.');
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
});

module.exports = { getSettings, putSettings };

