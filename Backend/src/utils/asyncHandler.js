/**
 * Wrapper untuk controller async agar tidak perlu try-catch berulang
 * di setiap fungsi. Error yang terjadi otomatis dilempar ke errorHandler.
 *
 * Pemakaian:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = asyncHandler;
