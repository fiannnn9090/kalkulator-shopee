/**
 * Menghubungkan hasil kalkulator (window.__lastSimResult dari script.js)
 * ke backend, dan menjaga agar hanya user yang login yang bisa memakai
 * halaman ini.
 */

const MARGIN_MINIMUM_PERSEN = 10;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireLoginOrRedirect();
    if (!user) return; // sudah di-redirect ke login.html

    const navUserInfo = document.getElementById('nav-user-info');
    if (navUserInfo) {
        navUserInfo.textContent = user.nama_lengkap || user.username;
        navUserInfo.classList.remove('hidden');
    }

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    setupSaveModal();
});

function setupSaveModal() {
    const modal = document.getElementById('modal-simpan');
    const btnOpen = document.getElementById('btn-simpan-simulasi');
    const btnCancel = document.getElementById('modal-batal');
    const btnSubmit = document.getElementById('modal-simpan-submit');
    const inputNama = document.getElementById('modal-nama-produk');
    const msgEl = document.getElementById('modal-simpan-msg');

    if (!modal || !btnOpen) return; // halaman ini tidak punya fitur simpan (mis. history.html)

    btnOpen.addEventListener('click', () => {
        if (!window.__lastSimResult) {
            showToast('Hitung dulu simulasinya sebelum disimpan.');
            return;
        }
        msgEl.classList.add('hidden');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        inputNama.focus();
    });

    btnCancel.addEventListener('click', () => closeModal(modal));

    btnSubmit.addEventListener('click', async () => {
        const namaProduk = inputNama.value.trim();
        if (!namaProduk) {
            showModalMsg(msgEl, 'Nama produk wajib diisi.', 'error');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
        try {
            const payload = buildSimulationPayload(namaProduk);
            await apiPost('/simulations', payload);
            closeModal(modal);
            inputNama.value = '';
            showToast('Simulasi berhasil disimpan ke riwayat!');
        } catch (err) {
            showModalMsg(msgEl, err.message, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Simpan';
        }
    });
}

function closeModal(modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function showModalMsg(el, text, type) {
    el.textContent = text;
    el.className = `text-xs mb-3 ${type === 'error' ? 'text-red-500' : 'text-emerald-600'}`;
}

/**
 * Rule-based warning (bukan AI) sesuai kebutuhan awal:
 * - harga jual di bawah modal -> harga terlalu rendah
 * - margin di bawah ambang minimum -> margin rendah
 * - profit bersih sangat kecil (< Rp 1.000) -> profit sangat kecil
 */
function determineStatusWarning(r) {
    if (r.hargaJual <= r.modalTotal) return 'harga_terlalu_rendah';
    if (r.margin < MARGIN_MINIMUM_PERSEN) return 'margin_rendah';
    if (r.profitBersih < 1000) return 'profit_sangat_kecil';
    return 'aman';
}

function buildSimulationPayload(namaProduk) {
    const r = window.__lastSimResult;

    const profitKotor = r.hargaJual - r.modalTotal;
    const roiPersen = r.modalTotal > 0 ? (r.profitBersih / r.modalTotal) * 100 : 0;

    return {
        namaProduk,
        mode: r.mode,
        kategoriKode: r.kategoriKode && r.kategoriKode.startsWith('rate_') ? r.kategoriKode : null,
        hargaModal: r.modalTotal,
        targetProfitType: r.mode === 1 ? r.profitType : null,
        targetProfitValue: r.mode === 1 ? parseIDR(r.targetValRaw) : null,
        hargaJual: r.hargaJual,
        biayaAdmin: r.biayaAdmin,
        biayaProsesPesanan: r.orderProcessingFee,
        biayaPromo: {
            voucher: r.voucher,
            ads: r.biayaAds,
            mallPayment: r.biayaPembayaranMall,
            feeBreakdown: r.feeBreakdown,
            bepPrice: r.bepPrice
        },
        profitKotor,
        profitBersih: r.profitBersih,
        marginPersen: r.margin,
        roiPersen,
        bepHarga: null,
        statusWarning: determineStatusWarning(r)
    };
}
