let profitChartInstance = null;
let marginChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireLoginOrRedirect();
    if (!user) return;

    document.getElementById('nav-user-info').textContent = user.nama_lengkap || user.username;
    document.getElementById('nav-user-info').classList.remove('hidden');
    document.getElementById('nav-logout').addEventListener('click', logoutUser);
    document.getElementById('greeting').textContent = `Halo, ${user.nama_lengkap || user.username}! 👋`;

    await loadDashboard();
});

async function loadDashboard() {
    try {
        const res = await apiGet('/dashboard');
        const data = res.data;

        document.getElementById('loading-state').classList.add('hidden');

        if (!data.summary.totalSimulasi) {
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }

        document.getElementById('dashboard-content').classList.remove('hidden');
        if (data.store) {
            document.getElementById('store-name').textContent = `Toko: ${data.store.nama_toko}`;
        }

        renderSummary(data.summary, data.topProfit);
        renderTopProfitCard(data.topProfit);
        renderLatestCard(data.latest);
        renderCharts(data.chart);
    } catch (err) {
        document.getElementById('loading-state').classList.add('hidden');
        showToast(err.message || 'Gagal memuat dashboard.');
    }
}

function renderSummary(summary, topProfit) {
    document.getElementById('stat-total-simulasi').textContent = summary.totalSimulasi;
    document.getElementById('stat-total-profit').textContent = `Rp ${formatIDRNum(summary.totalProfit)}`;
    document.getElementById('stat-rata-margin').textContent = `${summary.rataRataMargin.toFixed(1)}%`;
    document.getElementById('stat-top-profit').textContent =
        topProfit ? `Rp ${formatIDRNum(topProfit.profit_bersih)}` : 'Rp 0';
}

function renderTopProfitCard(item) {
    const el = document.getElementById('top-profit-card');
    if (!item) {
        el.innerHTML = '<p class="text-neutral-400">Belum ada data</p>';
        return;
    }
    el.innerHTML = `
        <p class="font-bold text-neutral-800 text-sm mb-1">${escapeHtml(item.nama_produk)}</p>
        <p class="text-emerald-600 font-extrabold text-base mb-0.5">Rp ${formatIDRNum(item.profit_bersih)}</p>
        <p class="text-neutral-400">Margin ${Number(item.margin_persen).toFixed(1)}% &middot; ${formatDate(item.created_at)}</p>
    `;
}

function renderLatestCard(item) {
    const el = document.getElementById('latest-card');
    if (!item) {
        el.innerHTML = '<p class="text-neutral-400">Belum ada data</p>';
        return;
    }
    const STATUS_LABEL = {
        aman: { text: 'Aman', cls: 'bg-emerald-50 text-emerald-600' },
        margin_rendah: { text: 'Margin Rendah', cls: 'bg-amber-50 text-amber-600' },
        harga_terlalu_rendah: { text: 'Harga Rendah', cls: 'bg-red-50 text-red-500' },
        profit_sangat_kecil: { text: 'Profit Kecil', cls: 'bg-orange-50 text-orange-500' }
    };
    const badge = STATUS_LABEL[item.status_warning] || STATUS_LABEL.aman;
    el.innerHTML = `
        <p class="font-bold text-neutral-800 text-sm mb-1">${escapeHtml(item.nama_produk)}</p>
        <p class="font-extrabold text-base mb-1 ${item.profit_bersih < 0 ? 'text-red-500' : 'text-neutral-800'}">
            Rp ${formatIDRNum(item.profit_bersih)}
        </p>
        <span class="text-[10px] font-bold px-2 py-1 rounded-full ${badge.cls}">${badge.text}</span>
        <p class="text-neutral-400 mt-1.5">${formatDate(item.created_at)}</p>
    `;
}

function renderCharts(chartData) {
    const labels = chartData.map(d => truncate(d.namaProduk, 12));
    const profitValues = chartData.map(d => d.profitBersih);
    const marginValues = chartData.map(d => d.marginPersen);

    if (profitChartInstance) profitChartInstance.destroy();
    if (marginChartInstance) marginChartInstance.destroy();

    const ctxProfit = document.getElementById('chartProfit').getContext('2d');
    profitChartInstance = new Chart(ctxProfit, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Profit Bersih (Rp)',
                data: profitValues,
                backgroundColor: profitValues.map(v => v < 0 ? '#EF4444' : '#EE4D2D'),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: (v) => 'Rp ' + formatIDRNum(v) } }
            }
        }
    });

    const ctxMargin = document.getElementById('chartMargin').getContext('2d');
    marginChartInstance = new Chart(ctxMargin, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Margin (%)',
                data: marginValues,
                borderColor: '#EE4D2D',
                backgroundColor: 'rgba(238, 77, 45, 0.1)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#EE4D2D'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: (v) => v + '%' } }
            }
        }
    });
}

function formatIDRNum(num) {
    return new Intl.NumberFormat('id-ID').format(Math.round(Number(num) || 0));
}

function formatDate(str) {
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
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