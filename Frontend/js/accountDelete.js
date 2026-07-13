document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireLoginOrRedirect();
    if (!user) return;

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const btnDeleteStore = document.getElementById('btn-delete-default-store');

    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', async () => {
            const ok = confirm('HAPUS AKUN?\n\nIni akan menghapus akun serta seluruh toko dan riwayat simulasi kamu.');
            if (!ok) return;

            try {
                btnDeleteAccount.disabled = true;
                const res = await apiDelete('/account/me');
                showToast(res.message || 'Akun berhasil dihapus.');
                window.location.href = 'login.html';
            } catch (err) {
                showToast(err.message || 'Gagal menghapus akun.');
                btnDeleteAccount.disabled = false;
            }
        });
    }

    if (btnDeleteStore) {
        btnDeleteStore.addEventListener('click', async () => {
            const ok = confirm('HAPUS TOKO DEFAULT?\n\nIni akan menghapus toko default (termasuk pengaturan toko) tetapi akun tetap ada.');
            if (!ok) return;

            try {
                btnDeleteStore.disabled = true;
                const res = await apiDelete('/account/store/default');
                showToast(res.message || 'Toko default berhasil dihapus.');
                // setelah store terhapus, settings bisa tidak tersedia (tetap aman).
                window.location.href = 'settings.html';
            } catch (err) {
                showToast(err.message || 'Gagal menghapus toko.');
                btnDeleteStore.disabled = false;
            }
        });
    }
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2500);
}

