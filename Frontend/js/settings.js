const MAPPING = {
    biayaProses: {
        inputId: 'input-biaya-proses',
        parse: (el) => parseIDR(el.value),
        format: (v) => formatIDR(v)
    }
};

let currentData = null;

function parseIDR(str) {
    return parseInt((str || '').toString().replace(/\D/g, '')) || 0;
}

function formatIDR(num) {
    return new Intl.NumberFormat('id-ID').format(Math.round(Number(num) || 0));
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2500);
}

function setFormFromData(data) {
    currentData = data;

    document.getElementById('input-nama-toko').value = data.store?.nama_toko || '';

    document.getElementById('input-biaya-proses').value = formatIDR(data.settings?.biayaProsesPesanan || 0);
    document.getElementById('input-voucher-persen').value = String(data.settings?.voucherDefaultPersen ?? 0);
    document.getElementById('input-ongkir-gratis-xtra').checked = !!data.settings?.ongkirGratisOngkirXtra;

    document.getElementById('settings-summary').innerHTML = `
        <div class="space-y-1">
            <div><span class="font-bold">Toko:</span> ${escapeHtml(data.store?.nama_toko || '-') }</div>
            <div><span class="font-bold">Biaya admin default:</span> Rp ${formatIDR(data.settings?.biayaProsesPesanan || 0)}</div>
            <div><span class="font-bold">Voucher default:</span> ${Number(data.settings?.voucherDefaultPersen || 0).toFixed(2)}%</div>
            <div><span class="font-bold">Gratis Ongkir XTRA:</span> ${data.settings?.ongkirGratisOngkirXtra ? 'Ya' : 'Tidak'}</div>
        </div>
    `;
}

function resetFormToCurrent() {
    if (!currentData) return;
    setFormFromData(currentData);
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireLoginOrRedirect();
    if (!user) return;

    const navUserInfo = document.getElementById('nav-user-info');
    if (navUserInfo) {
        navUserInfo.textContent = user.nama_lengkap || user.username;
        navUserInfo.classList.remove('hidden');
    }

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    // input formatter sederhana untuk biaya (idr)
    const biayaEl = document.getElementById('input-biaya-proses');
    biayaEl?.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = formatIDR(raw);
    });

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const btn = document.getElementById('btn-save-settings');
        btn.disabled = true;
        const prevText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...';

        try {
            const payload = {
                namaToko: document.getElementById('input-nama-toko').value.trim(),
                biayaProsesPesanan: parseIDR(document.getElementById('input-biaya-proses').value),
                voucherDefaultPersen: Number(document.getElementById('input-voucher-persen').value) || 0,
                ongkirGratisOngkirXtra: document.getElementById('input-ongkir-gratis-xtra').checked
            };

            const res = await apiPut('/settings', payload);
            setFormFromData(res.data || res);
            showToast('Pengaturan berhasil disimpan!');
        } catch (err) {
            showToast(err.message || 'Gagal menyimpan pengaturan.');
        } finally {
            btn.disabled = false;
            btn.textContent = prevText.replace(/\s+/g, ' ').trim();
        }
    });

    document.getElementById('btn-reset-form').addEventListener('click', () => {
        resetFormToCurrent();
        showToast('Form di-reset.');
    });

    try {
        const res = await apiGet('/settings');
        setFormFromData(res.data);
    } catch (err) {
        document.getElementById('settings-summary').textContent = err.message || 'Gagal memuat pengaturan.';
    }
});

