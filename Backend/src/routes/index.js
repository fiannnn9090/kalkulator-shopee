const express = require('express');
const router = express.Router();

/**
 * Health check - dipakai untuk memastikan server & database hidup.
 * Berguna juga sebagai endpoint monitoring saat sudah di-deploy.
 */
const { pool } = require('../config/db');
router.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, message: 'Server & database aktif.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database tidak terhubung.' });
    }
});

router.use('/auth', require('./authRoutes'));
router.use('/simulations', require('./simulationRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

router.use('/settings', require('./settingsRoutes'));
router.use('/account', require('./accountRoutes'));
router.use('/categories', require('./categoryRoutes'));


module.exports = router;


