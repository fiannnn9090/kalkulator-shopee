/**
 * Helper komunikasi ke Backend Auth API.
 * API_BASE_URL dibuat otomatis mengikuti host yang dipakai untuk membuka
 * frontend (localhost / 127.0.0.1 / IP lokal), supaya tidak mismatch origin
 * dengan CORS backend. Kalau backend jalan di port lain, ubah PORT_BACKEND saja.
 */
const PORT_BACKEND = 5000;
const API_BASE_URL = (() => {
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${host}:${PORT_BACKEND}/api`;
})();

function friendlyNetworkError(err) {
    if (err instanceof TypeError) {
        // fetch() melempar TypeError kalau request gagal total (server mati,
        // salah port, atau diblokir CORS) -- bukan error dari backend.
        return new Error(
            `Tidak bisa terhubung ke server (${API_BASE_URL}). ` +
            `Pastikan backend sudah dijalankan (npm start di folder Backend) ` +
            `dan port-nya sesuai.`
        );
    }
    return err;
}

async function apiPost(path, body) {
    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // wajib, supaya cookie session ikut terkirim
            body: JSON.stringify(body)
        });
    } catch (err) {
        throw friendlyNetworkError(err);
    }
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan.');
    }
    return data;
}

async function apiGet(path) {
    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            credentials: 'include'
        });
    } catch (err) {
        throw friendlyNetworkError(err);
    }
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan.');
    }
    return data;
}

async function apiPut(path, body) {
    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });
    } catch (err) {
        throw friendlyNetworkError(err);
    }
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan.');
    }
    return data;
}

async function apiDelete(path) {
    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            credentials: 'include'
        });
    } catch (err) {
        throw friendlyNetworkError(err);
    }
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan.');
    }
    return data;
}

/**
 * Dipanggil di halaman yang butuh login (misal dashboard.html).
 * Kalau sesi tidak valid, otomatis redirect ke login.html.
 */
async function requireLoginOrRedirect() {
    try {
        const res = await apiGet('/auth/me');
        return res.data;
    } catch (err) {
        window.location.href = 'login.html';
        return null;
    }
}

async function logoutUser() {
    try {
        await apiPost('/auth/logout', {});
    } finally {
        window.location.href = 'login.html';
    }
}