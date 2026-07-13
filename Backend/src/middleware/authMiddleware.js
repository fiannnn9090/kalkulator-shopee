/**
 * Middleware proteksi route yang butuh login.
 * Logika session/login lengkap akan diimplementasikan di Tahap 2 (Fitur Login).
 * Untuk sekarang disiapkan strukturnya saja agar route lain bisa langsung
 * memakai `requireAuth` tanpa perlu diubah lagi nanti.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Anda harus login terlebih dahulu.'
    });
}

module.exports = { requireAuth };
