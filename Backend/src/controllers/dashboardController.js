const simulationModel = require('../models/simulationModel');
const { findDefaultStoreByUserId } = require('../models/storeModel');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/dashboard
 * Mengumpulkan semua data yang dibutuhkan halaman dashboard dalam satu request,
 * supaya frontend tidak perlu memanggil banyak endpoint terpisah.
 */
const getDashboard = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const [summary, topProfit, latest, chartData, store] = await Promise.all([
        simulationModel.getDashboardSummary(userId),
        simulationModel.findTopProfit(userId),
        simulationModel.findLatest(userId),
        simulationModel.findChartData(userId, 10),
        findDefaultStoreByUserId(userId)
    ]);

    return success(res, {
        store,
        summary: {
            totalSimulasi: Number(summary.total_simulasi) || 0,
            totalProfit: Number(summary.total_profit) || 0,
            rataRataMargin: Number(summary.rata_rata_margin) || 0
        },
        topProfit,
        latest,
        chart: chartData.map(row => ({
            id: row.id,
            namaProduk: row.nama_produk,
            profitBersih: Number(row.profit_bersih),
            marginPersen: Number(row.margin_persen),
            createdAt: row.created_at
        }))
    });
});

module.exports = { getDashboard };