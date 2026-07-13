let currentPage = 1;
let currentItemForAction = null; // id simulasi yang lagi diedit/dihapus

const STATUS_LABEL = {
    aman: { text: 'Aman', cls: 'bg-emerald-50 text-emerald-600' },
    margin_rendah: { text: 'Margin Rendah', cls: 'bg-amber-50 text-amber-600' },
    harga_terlalu_rendah: { text: 'Harga Rendah', cls: 'bg-red-50 text-red-500' },
    profit_sangat_kecil: { text: 'Profit Kecil', cls: 'bg-orange-50 text-orange-500' }
};

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireLoginOrRedirect();
    if (!user) return;

    const navUserInfo = document.getElementById('nav-user-info');
    navUserInfo.textContent = user.nama_lengkap || user.username;
    navUserInfo.classList.remove('hidden');
    document.getElementById('nav-logout').addEventListener('click', logoutUser);

    document.getElementById('filter-q').addEventListener('input', debounce(() => { currentPage = 1; loadHistory(); }, 400));
    document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; loadHistory(); });
    document.getElementById('filter-sort').addEventListener('change', () => { currentPage = 1; loadHistory(); });
    document.getElementById('btn-prev').addEventListener('click', () => { currentPage--; loadHistory(); });
    document.getElementById('btn-next').addEventListener('click', () => { currentPage++; loadHistory(); });

    setupEditModal();
    setupDeleteModal();

    loadHistory();
});

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadHistory() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('table-wrap').classList.add('hidden');
    document.getElementById('pagination').classList.add('hidden');

    const q = document.getElementById('filter-q').value.trim();
    const status = document.getElementById('filter-status').value;
    const [sort, dir] = document.getElementById('filter-sort').value.split(':');

    const params = new URLSearchParams({ page: currentPage, limit: 10, sort, dir });
    if (q) params.set('q', q);
    if (status) params.set('status', status);

    try {
        const res = await apiGet(`/simulations?${params.toString()}`);
        renderTable(res.data.items);
        renderPagination(res.data.pagination);
    } catch (err) {
        showToast(err.message || 'Gagal memuat riwayat.');
    } finally {
        document.getElementById('loading-state').classList.add('hidden');
    }
}

function renderTable(items) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (!items.length) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }
    document.getElementById('table-wrap').classList.remove('hidden');

    items.forEach(item => {
        const badge = STATUS_LABEL[item.status_warning] || STATUS_LABEL.aman;
        const tr = document.createElement('tr');
        tr.className = 'border-t border-neutral-100 hover:bg-neutral-50/60';
        tr.innerHTML = `
            <td class="px-4 py-3 font-semibold text-neutral-800">${escapeHtml(item.nama_produk)}</td>
            <td class="px-4 py-3 text-neutral-400 text-xs">${formatDate(item.created_at)}</td>
            <td class="px-4 py-3 text-right font-semibold">Rp ${formatIDRNum(item.harga_jual)}</td>
            <td class="px-4 py-3 text-right">${Number(item.margin_persen).toFixed(1)}%</td>
            <td class="px-4 py-3 text-right font-semibold ${item.profit_bersih < 0 ? 'text-red-500' : 'text-emerald-600'}">Rp ${formatIDRNum(item.profit_bersih)}</td>
            <td class="px-4 py-3 text-center">
                <span class="text-[10px] font-bold px-2 py-1 rounded-full ${badge.cls}">${badge.text}</span>
            </td>
            <td class="px-4 py-3 text-center">
                <button data-id="${item.id}" data-nama="${escapeHtml(item.nama_produk)}" class="btn-edit text-neutral-400 hover:text-shopee px-1.5"><i class="fas fa-pen"></i></button>
                <button data-id="${item.id}" class="btn-delete text-neutral-400 hover:text-red-500 px-1.5"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id, btn.dataset.nama));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

function renderPagination(pagination) {
    const el = document.getElementById('pagination');
    if (pagination.total <= pagination.limit) {
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');
    document.getElementById('pagination-info').textContent =
        `Halaman ${pagination.page} dari ${pagination.totalPages} (${pagination.total} simulasi)`;
    document.getElementById('btn-prev').disabled = pagination.page <= 1;
    document.getElementById('btn-next').disabled = pagination.page >= pagination.totalPages;
}

// ===== Edit (rename) =====
function setupEditModal() {
    const modal = document.getElementById('modal-edit');
    document.getElementById('edit-batal').addEventListener('click', () => toggleModal(modal, false));
    document.getElementById('edit-submit').addEventListener('click', async () => {
        const nama = document.getElementById('edit-nama-produk').value.trim();
        const msgEl = document.getElementById('edit-msg');
        if (!nama) {
            msgEl.textContent = 'Nama produk wajib diisi.';
            msgEl.className = 'text-xs mb-3 text-red-500';
            return;
        }
        try {
            const detail = await apiGet(`/simulations/${currentItemForAction}`);
            const s = detail.data;
            await apiPut(`/simulations/${currentItemForAction}`, {
                namaProduk: nama,
                mode: s.mode,
                kategoriKode: null,
                hargaModal: s.harga_modal,
                targetProfitType: s.target_profit_type,
                targetProfitValue: s.target_profit_value,
                hargaJual: s.harga_jual,
                biayaAdmin: s.biaya_admin,
                biayaProsesPesanan: s.biaya_proses_pesanan,
                biayaPromo: JSON.parse(s.biaya_promo_json || '{}'),
                profitKotor: s.profit_kotor,
                profitBersih: s.profit_bersih,
                marginPersen: s.margin_persen,
                roiPersen: s.roi_persen,
                bepHarga: s.bep_harga,
                statusWarning: s.status_warning
            });
            toggleModal(modal, false);
            showToast('Nama produk berhasil diperbarui.');
            loadHistory();
        } catch (err) {
            msgEl.textContent = err.message;
            msgEl.className = 'text-xs mb-3 text-red-500';
        }
    });
}

function openEditModal(id, nama) {
    currentItemForAction = id;
    document.getElementById('edit-nama-produk').value = nama;
    document.getElementById('edit-msg').classList.add('hidden');
    toggleModal(document.getElementById('modal-edit'), true);
}

// ===== Delete =====
function setupDeleteModal() {
    const modal = document.getElementById('modal-delete');
    document.getElementById('delete-batal').addEventListener('click', () => toggleModal(modal, false));
    document.getElementById('delete-submit').addEventListener('click', async () => {
        try {
            await apiDelete(`/simulations/${currentItemForAction}`);
            toggleModal(modal, false);
            showToast('Simulasi berhasil dihapus.');
            loadHistory();
        } catch (err) {
            showToast(err.message);
        }
    });
}

function openDeleteModal(id) {
    currentItemForAction = id;
    toggleModal(document.getElementById('modal-delete'), true);
}

function toggleModal(modal, show) {
    modal.classList.toggle('hidden', !show);
    modal.classList.toggle('flex', show);
}

// ===== Helpers =====
function formatIDRNum(num) {
    return new Intl.NumberFormat('id-ID').format(Math.round(Number(num) || 0));
}

function formatDate(str) {
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2500);
}
