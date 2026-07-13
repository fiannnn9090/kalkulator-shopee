/**
 * Helper agar format response API konsisten di seluruh endpoint.
 */
function success(res, data = null, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
}

function fail(res, message = 'Terjadi kesalahan', statusCode = 400, errors = null) {
    return res.status(statusCode).json({
        success: false,
        message,
        errors
    });
}

module.exports = { success, fail };
