/**
 * Middleware penangkap error terpusat.
 * Semua error yang dilempar dari controller (lewat asyncHandler atau next(err))
 * akan berakhir di sini supaya format error response konsisten.
 */
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Terjadi kesalahan pada server',
        errors: err.errors || null
    });
}

/**
 * Middleware untuk menangkap request ke route yang tidak terdaftar.
 */
function notFound(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`
    });
}

module.exports = { errorHandler, notFound };
