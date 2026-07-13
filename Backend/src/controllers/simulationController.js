const simulationModel = require('../models/simulationModel');
const categoryModel = require('../models/categoryModel');
const { findDefaultStoreByUserId } = require('../models/storeModel');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const VALID_STATUS = ['aman', 'margin_rendah', 'harga_terlalu_rendah', 'profit_sangat_kecil'];

/**
 * Validasi & normalisasi body request simulasi.
 * Dipakai bersama oleh create dan update supaya konsisten.
 */
async function buildPayloadFromBody(body) {
    const errors = [];

    if (!body.namaProduk || !body.namaProduk.trim()) {
        errors.push('Nama produk wajib diisi.');
    }
    if (![1, 2].includes(Number(body.mode))) {
        errors.push('Mode simulasi tidak valid.');
    }
    if (!(Number(body.hargaModal) >= 0)) {
        errors.push('Harga modal tidak valid.');
    }
    if (!(Number(body.hargaJual) > 0)) {
        errors.push('Harga jual tidak valid.');
    }
    if (body.statusWarning && !VALID_STATUS.includes(body.statusWarning)) {
        errors.push('Status warning tidak valid.');
    }

    if (errors.length) {
        const err = new Error(errors.join(' '));
        err.statusCode = 400;
        throw err;
    }

    let categoryId = null;
    if (body.kategoriKode) {
        const category = await categoryModel.findByKode(body.kategoriKode);
        categoryId = category ? category.id : null;
    }

    return {
        namaProduk: body.namaProduk.trim(),
        mode: Number(body.mode),
        hargaModal: Number(body.hargaModal),
        targetProfitType: body.targetProfitType || null,
        targetProfitValue: body.targetProfitValue != null ? Number(body.targetProfitValue) : null,
        hargaJual: Number(body.hargaJual),
        biayaAdmin: Number(body.biayaAdmin) || 0,
        biayaProsesPesanan: Number(body.biayaProsesPesanan) || 0,
        biayaPromo: body.biayaPromo || {},
        profitKotor: Number(body.profitKotor) || 0,
        profitBersih: Number(body.profitBersih) || 0,
        marginPersen: Number(body.marginPersen) || 0,
        roiPersen: Number(body.roiPersen) || 0,
        bepHarga: body.bepHarga != null ? Number(body.bepHarga) : null,
        statusWarning: body.statusWarning || 'aman',
        categoryId
    };
}

/**
 * POST /api/simulations
 */
const createSimulation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const store = await findDefaultStoreByUserId(userId);
    if (!store) {
        return fail(res, 'Toko tidak ditemukan untuk akun ini.', 400);
    }

    const payload = await buildPayloadFromBody(req.body);
    const id = await simulationModel.create(userId, store.id, payload);

    return success(res, { id }, 'Simulasi berhasil disimpan.', 201);
});

/**
 * GET /api/simulations?q=&status=&sort=&dir=&page=&limit=
 */
const listSimulations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { rows, total } = await simulationModel.findAllByUser(userId, {
        q: req.query.q,
        status: req.query.status,
        sort: req.query.sort,
        dir: req.query.dir,
        limit,
        offset
    });

    return success(res, {
        items: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
});

/**
 * GET /api/simulations/:id
 */
const getSimulation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const item = await simulationModel.findById(req.params.id, userId);
    if (!item) {
        return fail(res, 'Simulasi tidak ditemukan.', 404);
    }
    return success(res, item);
});

/**
 * PUT /api/simulations/:id
 */
const updateSimulation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const existing = await simulationModel.findById(req.params.id, userId);
    if (!existing) {
        return fail(res, 'Simulasi tidak ditemukan.', 404);
    }

    const payload = await buildPayloadFromBody(req.body);
    await simulationModel.update(req.params.id, userId, payload);

    return success(res, null, 'Simulasi berhasil diperbarui.');
});

/**
 * DELETE /api/simulations/:id
 */
const deleteSimulation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const deleted = await simulationModel.remove(req.params.id, userId);
    if (!deleted) {
        return fail(res, 'Simulasi tidak ditemukan.', 404);
    }
    return success(res, null, 'Simulasi berhasil dihapus.');
});

module.exports = { createSimulation, listSimulations, getSimulation, updateSimulation, deleteSimulation };
