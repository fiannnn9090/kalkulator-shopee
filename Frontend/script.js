/**
 * SHOPEE PROFIT CALCULATOR INDONESIA
 * Premium System Dashboard Logic - Shopee Adaptive Style
 */

const SHOPEE_DB = {
    rate_1000: { admin: { 'non-star': 10.0, star: 10.0, mall: 12.5 } },
    rate_950:  { admin: { 'non-star': 9.50, star: 9.50, mall: 11.5 } },
    rate_900:  { admin: { 'non-star': 9.00, star: 9.00, mall: 11.0 } },
    rate_825:  { admin: { 'non-star': 8.25, star: 8.25, mall: 10.0 } },
    rate_675:  { admin: { 'non-star': 6.75, star: 6.75, mall: 8.5  } },
    rate_650:  { admin: { 'non-star': 6.50, star: 6.50, mall: 8.0  } },
    rate_525:  { admin: { 'non-star': 5.25, star: 5.25, mall: 7.0  } },
    rate_425:  { admin: { 'non-star': 4.25, star: 4.25, mall: 5.5  } },
    rate_250:  { admin: { 'non-star': 2.50, star: 2.50, mall: 3.5  } }
};

// Biaya Proses Pesanan: flat fee per completed transaction, applies to every order regardless of category/status
const ORDER_PROCESSING_FEE = 1250;

// Program promosi, program konten, dan biaya tambahan/komisi opsional.
// "cap" = plafon nominal maksimum (Rp) untuk biaya tsb per transaksi, null = tanpa plafon.
const FEE_ITEMS = {
    ongkirXtra:   { id: 'gongkir-xtra',         label: 'Gratis Ongkir XTRA',    group: 'promo',   pct: 5.50, cap: 40000 },
    cashbackXtra: { id: 'cashback-xtra',        label: 'Cashback XTRA',         group: 'promo',   pct: 1.40, cap: null  },
    videoXtra:    { id: 'video-xtra',           label: 'Shopee Video XTRA',     group: 'konten',  pct: 3.00, cap: 20000 },
    liveXtra:     { id: 'live-xtra',            label: 'Shopee Live XTRA',      group: 'konten',  pct: 3.00, cap: null  },
    asuransi:     { id: 'asuransi-pengiriman',  label: 'Asuransi Pengiriman',   group: 'tambahan', pct: 0.50, cap: null }
};

let currentMode = 1; 
let myChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initInputs();
    initEventListeners();
    calculate(); 
});

function initInputs() {
    document.querySelectorAll('.idr-input').forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, "");
            if (e.target.id === 'target-val' && document.getElementById('profit-type').value === 'persen') {
                return;
            }
            e.target.value = formatIDR(val);
        });
    });
}

function initEventListeners() {
    document.getElementById('tab-mode1').addEventListener('click', () => switchMode(1));
    document.getElementById('tab-mode2').addEventListener('click', () => switchMode(2));

    const comboInput = document.getElementById('combo_produk_autocomplete');
    const comboSugEl = document.getElementById('combo_produk_suggestions');

    // ===== autocomplete baru: ambil dari backend (DB) + tampilkan persen =====
    let lastSelectedKategoriKode = null;
    let abortTimer = null;

    async function fetchSuggestions(q) {
        const status = document.querySelector('input[name="seller_status"]:checked')?.value || 'non-star';
        const API_BASE_URL = (window.location.protocol === 'https:' ? 'https:' : 'http:') + '//' + (window.location.hostname || 'localhost') + ':5000/api';
        const qs = new URLSearchParams({
            q,
            limit: '10',
            status
        });

        const res = await fetch(`${API_BASE_URL}/categories/suggestions?${qs.toString()}`, {
            method: 'GET',
            credentials: 'include', // WAJIB: endpoint ini butuh session cookie (requireAuth)
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
            // sesi login habis/tidak valid -> arahkan ke login daripada gagal diam-diam
            window.location.href = 'login.html';
            return [];
        }

        if (!res.ok) {
            console.error('Gagal mengambil saran kategori/produk:', res.status, await res.text().catch(() => ''));
            return [];
        }

        const data = await res.json();
        return data?.data?.items || [];
    }

    function setSuggestionVisibility(hidden) {
        if (!comboSugEl) return;
        comboSugEl.classList.toggle('hidden', !!hidden);
    }

    function renderSuggestions(items) {
        if (!comboSugEl) return;
        if (!items?.length) {
            comboSugEl.innerHTML = '';
            setSuggestionVisibility(true);
            return;
        }

        comboSugEl.innerHTML = items.map((it, idx) => {
            const pctLabel = (Number(it.pct) || 0).toFixed(2).replace(/\.00$/, '').replace(/\.?0$/, '');
            return `
                <button type="button" class="w-full text-left px-3 py-2 text-xs hover:bg-shopee-light/70" data-idx="${idx}" data-kode="${it.kategoriKode}" data-label="${it.label}">
                    <div class="flex items-center justify-between gap-3">
                        <div class="truncate">${it.label}</div>
                        <div class="shrink-0 text-[10px] font-bold text-shopee">${pctLabel}%</div>
                    </div>
                </button>`;
        }).join('');
        // simpan item mentah (termasuk pctNonStar/pctStar/pctMall) agar bisa diambil saat diklik
        comboSugEl.__items = items;
        setSuggestionVisibility(false);
    }

    if (comboInput && comboSugEl) {
        comboInput.oninput = (e) => {
            const q = (e.target.value || '').trim();
            lastSelectedKategoriKode = null;
            // user mengetik ulang (belum memilih saran baru) -> tarif produk sebelumnya tidak valid lagi
            window.__selectedProdukTarif = null;
            window.__selectedKategoriKode = null;

            if (!q) {
                comboSugEl.innerHTML = '';
                setSuggestionVisibility(true);
                calculate();
                return;
            }

            clearTimeout(abortTimer);
            abortTimer = setTimeout(async () => {
                try {
                    const items = await fetchSuggestions(q);
                    renderSuggestions(items);
                } catch (err) {
                    console.error('Autocomplete kategori/produk gagal:', err);
                    comboSugEl.innerHTML = '';
                    setSuggestionVisibility(true);
                }
            }, 220);
        };

        comboSugEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-kode]');
            if (!btn) return;

            const idx = Number(btn.getAttribute('data-idx'));
            const item = (comboSugEl.__items || [])[idx];
            const kode = btn.getAttribute('data-kode');
            const label = btn.getAttribute('data-label');

            comboInput.value = label;
            comboSugEl.innerHTML = '';
            setSuggestionVisibility(true);

            lastSelectedKategoriKode = kode;

            // simpan ketiga tarif (non-star/star/mall) dari produk yang dipilih.
            // calculate() akan memakai ini secara langsung sesuai status yang aktif,
            // tanpa perlu fetch ulang ke backend saat status diganti.
            if (item) {
                window.__selectedProdukTarif = {
                    nonStar: Number(item.pctNonStar) || 0,
                    star: Number(item.pctStar) || 0,
                    mall: Number(item.pctMall) || 0
                };
            } else {
                window.__selectedProdukTarif = null;
            }

            window.__selectedKategoriKode = kode;

            calculate();
        });

        document.addEventListener('click', (e) => {
            if (!comboInput || !comboSugEl) return;
            if (e.target === comboInput || comboSugEl.contains(e.target)) return;
            setSuggestionVisibility(true);
        });
    }

    const allInputs = ['kategori', 'hpp', 'packing', 'target-val', 'ads-pct', 
                       'voucher-nominal', 'pembulatan', 'gongkir-xtra', 
                       'cashback-xtra', 'profit-slider', 'harga-jual-input',
                       'video-xtra', 'live-xtra', 'asuransi-pengiriman',
                       'komisi-xtra-pct', 'komisi-xtra-plus-pct'];


    
    allInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calculate);
    });

    document.getElementsByName('seller_status').forEach(radio => {
        radio.addEventListener('change', calculate);
    });

    document.getElementById('profit-type').addEventListener('change', (e) => {
        const slider = document.getElementById('slider-container');
        const targetInput = document.getElementById('target-val');
        const indicator = document.getElementById('profit-type-indicator');
        
        if (e.target.value === 'persen') {
            slider.classList.remove('hidden');
            targetInput.value = "20";
            indicator.innerText = "%";
        } else {
            slider.classList.add('hidden');
            targetInput.value = formatIDR(10000);
            indicator.innerText = "Rp";
        }
        calculate();
    });

    document.getElementById('btn-reset').addEventListener('click', resetForm);
    document.getElementById('btn-hitung').addEventListener('click', () => {
        calculate();
        showToast("Kalkulasi profit berhasil disinkronkan!");
    });
    
    document.getElementById('copy-price').addEventListener('click', copyPrice);
    document.getElementById('export-pdf').addEventListener('click', exportPDF);
    document.getElementById('export-excel').addEventListener('click', exportExcel);
}

function getActiveFeeItems() {
    // Kumpulkan semua item biaya opsional (promo/konten/tambahan) yang aktif (checkbox dicentang)
    let items = [];
    Object.keys(FEE_ITEMS).forEach(key => {
        const cfg = FEE_ITEMS[key];
        const el = document.getElementById(cfg.id);
        if (el && el.checked) {
            items.push({ key, label: cfg.label, group: cfg.group, pct: cfg.pct, cap: cfg.cap });
        }
    });

    const komisiXtra = parseFloat(document.getElementById('komisi-xtra-pct')?.value) || 0;
    if (komisiXtra > 0) {
        items.push({ key: 'komisiXtra', label: 'Komisi XTRA', group: 'tambahan', pct: komisiXtra, cap: null });
    }
    const komisiXtraPlus = parseFloat(document.getElementById('komisi-xtra-plus-pct')?.value) || 0;
    if (komisiXtraPlus > 0) {
        items.push({ key: 'komisiXtraPlus', label: 'Komisi XTRA+', group: 'tambahan', pct: komisiXtraPlus, cap: null });
    }
    return items;
}

// Data tarif rincian Fashion: Non-Star dan Star/Star+
// (Tahap awal: hanya subset yang ada di task kamu untuk kategori Fashion)
const FASHION_DETAIL = {
    "Bando & Bandana, Ikat Rambut, Pita & Scrunchie, Jepitan & Pin Rambut, Rambut Palsu & Extension, Hiasan Kepala, Tiara & Mahkota Bunga, Aksesoris Rambut Lainnya": { nonStarPct: 9.00, starPct: 9.00 },
    "Masker": { nonStarPct: 8.25, starPct: 8.25 },
    "Platinum & Emas, Perak, Berlian, Permata, Logam Mulia Lainnya": { nonStarPct: 4.25, starPct: 4.25 },

    "Kalung, Gelang Tangan, Cincin, Anting, Gelang Kaki, Liontin, Bros & Pin, Set Perhiasan, Perhiasan Berharga Lainnya": { nonStarPct: 9.00, starPct: 9.00 },
    "Aksesoris Fashion Lainnya": { nonStarPct: 9.00, starPct: 9.00 },

    "Ransel, Tas Selempang & Bahu, Tas Troli, Dompet, Tas & Koper Lainnya, Jam Tangan, Topi, Kacamata, Aksesoris Rambut, Sarung Tangan, Ikat Pinggang, Kaos Kaki, Syal, Alat Penutup Telinga, Aksesoris Bayi & Anak Lainnya, Jas Hujan, Sepatu Boot Hujan, Perlengkapan Hujan Lainnya": { nonStarPct: 9.00, starPct: 9.00 },
    "Kostum, Pakaian Dalam, Pakaian Tidur, Baju Renang, Kaos, Kaos Polo, Kemeja, Jaket & Coat Reguler, Outerwear Musim Dingin, Rompi, Sweater & Kardigan, Blazer, Hoodie, Outerwear Lainnya, Jeans, Celana, Celana Pendek, Overall, Jas & Setelan, Pakaian Anak Laki-Laki Lainnya, Atasan Lainnya, Bawahan Lainnya": { nonStarPct: 9.00, starPct: 9.00 },
    "Kostum, Pakaian Dalam, Baju Tidur, Baju Renang, Kaos, Kaos Polo, Kemeja & Blouse, Jaket & Coat Reguler, Outerwear Musim Dingin, Rompi, Sweater & Kardigan, Blazer, Hoodie, Outerwear Lainnya, Jeans, Celana Panjang, Celana Pendek, Rok, Legging, Romper, Jumpsuit & Overall, Dress, Jas & Setelan, Pakaian Anak Perempuan Lainnya, Atasan Lainnya, Bawahan Lainnya": { nonStarPct: 9.00, starPct: 9.00 },
    "Outerwear Reguler, Outerwear Musim Dingin, Dress, Celana Panjang & Legging, Celana Pendek, Rok, Bawahan Lainnya, Baju Tidur, Atasan, Bodysuit & Jumper, Set, Baju Renang, Pakaian Bayi Lainnya": { nonStarPct: 9.00, starPct: 9.00 },

    "Sepatu Bayi": { nonStarPct: 4.25, starPct: 4.25 },
    "Gelang, Anting, Kalung, Cincin, Perhiasan Lainnya": { nonStarPct: 4.25, starPct: 4.25 },
    "Fashion Bayi & Anak Lainnya": { nonStarPct: 9.00, starPct: 9.00 },

    "Baju Olahraga Muslim, Baju Renang Muslim": { nonStarPct: 10.00, starPct: 10.00 },
    "Set Perlengkapan Sholat, Sajadah, Peci, Songkok & Kopiah, Mukena, Mukena Travel, Mukena & Perlengkapan Sholat Lainnya": { nonStarPct: 8.25, starPct: 8.25 },
    "Strap, Alat Servis Jam Tangan, Pengait Jam Tangan, Baterai Jam Tangan, Kotak Jam Tangan, Aksesoris Jam Tangan lainnya": { nonStarPct: 9.00, starPct: 9.00 },

    "Tas Duffel": { nonStarPct: 10.00, starPct: 10.00 },
    "Passport Cover, Organizer Travel, Pelindung & Sarung Koper, Tag Koper, Strap Koper, Gembok Koper, Timbangan Koper, Bantal Leher & Penutup Mata, Botol & Wadah Isi Ulang, Aksesoris Travel Lainnya": { nonStarPct: 9.00, starPct: 9.00 },

    "Kaos Kaki": { nonStarPct: 10.00, starPct: 10.00 },
    "Kemeja, Kaos Polo, Kaos, Tanktop, Atasan Lainnya": { nonStarPct: 8.25, starPct: 8.25 },
    "Celana Panjang, Celana Panjang Lainnya, Cargo, Jogger": { nonStarPct: 10.00, starPct: 10.00 },
    "Hoodie, Sweatshirt, Hoodie & Sweatshirt Lainnya": { nonStarPct: 10.00, starPct: 10.00 },
    "Jaket, Rompi, Jaket & Mantel Musim Dingin, Jaket, Mantel, & Rompi Lainnya": { nonStarPct: 10.00, starPct: 10.00 },
    "Set Jas Formal, Jas & Blazer Formal, Celana Formal, Rompi Formal, Jas Formal Lainnya": { nonStarPct: 10.00, starPct: 10.00 },
    "Celana Dalam, Kaos Dalam, Pakaian Dalam Termal, Pakaian Dalam Lainnya": { nonStarPct: 10.00, starPct: 10.00 },
    "Pakaian Kerja": { nonStarPct: 10.00, starPct: 10.00 },
    "Pakaian Tidur": { nonStarPct: 10.00, starPct: 10.00 },
    "Atasan Tradisional, Bawahan Tradisional, Set Pakaian Tradisional, Pakaian Tradisional Lainnya": { nonStarPct: 10.00, starPct: 10.00 },
    "Sweater & Cardigan": { nonStarPct: 10.00, starPct: 10.00 },

    "Stocking, Kaos Kaki & Stocking Lainnya": { nonStarPct: 9.00, starPct: 9.00 }
};

// Daftar untuk autocomplete: kita generate dari keys FASHION_DETAIL.
const FASHION_COMBINED_AUTOCOMPLETE = Object.keys(FASHION_DETAIL).map(jenisProduk => {
    return { subKategori: 'Fashion', jenisProduk, nonStarPct: FASHION_DETAIL[jenisProduk].nonStarPct, starPct: FASHION_DETAIL[jenisProduk].starPct };
});

function getFashionCombinedText(item) {
    return `Fashion - ${item.subKategori} - ${item.jenisProduk}`;
}

// ===== Tarif Admin Final berdasarkan kategori besar (A/B/C/D/E) - keyword match =====
// Tujuan: agar semua kategori dari autocomplete menghasilkan adminPct yang sesuai acuan teks kamu,
// tanpa harus menulis detail subkategori/jenis produk untuk setiap kategori besar.
const ADMIN_FINAL_GROUP_BY_KEYWORD = {
    // A: 8,0%
    A: {
        pct: 8.0,
        keywords: [
            'Kesehatan',
            'Aksesoris Fashion',
            'Elektronik (Kelistrikan)',
            'Kelistrikan',
            'Pakaian Pria',
            'Sepatu Pria',
            'Handphone & Aksesoris',
            'Fashion Muslim',
            'Koper & Tas Travel',
            'Tas & Pakaian Wanita',
            'Sepatu Wanita',
            'Tas Pria',
            'Jam Tangan',
            'Audio',
            'Makanan & Minuman',
            'Perawatan & Kecantikan',
            'Ibu & Bayi',
            'Fashion Bayi & Anak',
            'Perlengkapan Rumah',
            'Olahraga & Outdoor',
            'Buku, Alat Tulis & Hobi',
            'Otomotif',
            'Tiket, Voucher & Layanan'
        ]
    },
    // B: 7,5%
    B: {
        pct: 7.5,
        keywords: ['Elektronik', 'Handphone & Aksesoris', 'Audio', 'Gaming & Konsol', 'Kamera & Drone', 'Mobil', 'Kesehatan', 'Makanan & Minuman', 'Hewan Peliharaan', 'Ibu & Bayi', 'Perlengkapan Rumah', 'Hobi & Koleksi']
    },
    // C: 5,75%
    C: {
        pct: 5.75,
        keywords: ['Elektronik (Alat Rumah Tangga)', 'Handphone & Aksesoris', 'Audio', 'Kamera & Drone', 'Komputer & Aksesoris', 'Makanan & Minuman', 'Ibu & Bayi']
    },
    // D: 4,25%
    D: {
        pct: 4.25,
        keywords: ['Komputer & Aksesoris', 'Elektronik', 'Handphone & Aksesoris', 'Fashion Anak & Aksesoris']
    },
    // E: 2,5%
    E: {
        pct: 2.5,
        keywords: ['Sepeda Motor', 'Unit Sepeda Motor']
    }
};

function normalizeComboText(s) {
    return (s || '').toString().trim().toLowerCase();
}

function getAdminPctFromComboSelection() {
    const comboInput = document.getElementById('combo_produk_autocomplete');
    const comboText = comboInput ? normalizeComboText(comboInput.value) : '';
    if (!comboText) return null;

    // Cari grup paling cocok berdasarkan keyword. Urut dari A->E agar A tidak tertutup grup lain.
    const groupsOrder = ['A', 'B', 'C', 'D', 'E'];
    for (const g of groupsOrder) {
        const cfg = ADMIN_FINAL_GROUP_BY_KEYWORD[g];
        if (!cfg?.keywords?.length) continue;
        const matched = cfg.keywords.some(k => normalizeComboText(k) && comboText.includes(normalizeComboText(k)));
        if (matched) {
            // Untuk Star/Star+ di teks kamu nilainya sama untuk tiap group (hanya Non-Star vs Star+ di rincian Fashion).
            // Maka di tahap ini adminPct = pct grup untuk semua status non-star/star.
            return cfg.pct;
        }
    }
    return null;
}

function getFashionAdminPct() {
    const rincian = document.getElementById('rincian_kategori')?.value;
    if (rincian && rincian !== 'fashion') return null;

    const subkategori = document.getElementById('fashion_subkategori')?.value;
    const jenisProduk = document.getElementById('fashion_jenisproduk')?.value;

    const effectiveSub = subkategori || '';
    const effectiveJenis = jenisProduk || '';

    const status = document.querySelector('input[name="seller_status"]:checked')?.value || 'non-star';

    const key = (effectiveJenis && FASHION_DETAIL[effectiveJenis])
        ? effectiveJenis
        : (effectiveSub || '');
    const found = FASHION_DETAIL[key];

    if (!found) return null;

    if (status === 'star' || status === 'non-star') {
        return status === 'non-star' ? found.nonStarPct : found.starPct;
    }
    if (status === 'mall') {
        return found.nonStarPct;
    }
    return found.nonStarPct;
}

function calculate() {

    const kategoriSelect = document.getElementById('kategori');
    const kat = kategoriSelect?.value || null;
    const status = document.querySelector('input[name="seller_status"]:checked')?.value || 'non-star';


    const hpp = parseIDR(document.getElementById('hpp').value);
    const packing = parseIDR(document.getElementById('packing').value);
    const adsPct = parseFloat(document.getElementById('ads-pct').value) || 0;
    const voucher = parseIDR(document.getElementById('voucher-nominal').value);
    const rounding = document.getElementById('pembulatan').value;

    const profitType = document.getElementById('profit-type').value;
    const profitSlider = document.getElementById('profit-slider').value;

    if (profitType === 'persen') {
        document.getElementById('target-val').value = profitSlider;
        document.getElementById('slider-label').innerText = `Target: ${profitSlider}%`;
    }

    // Biaya Administrasi (Komisi) dasar. Urutan prioritas:
    // 1. Produk/kategori yang dipilih dari searchbox autocomplete (dataset shopee_dataset_2026)
    // 2. Rincian Fashion manual (FASHION_DETAIL), jika elemen rincian tersedia
    // 3. Kategori kode lama (SHOPEE_DB rate_xxx), untuk kompatibilitas mundur
    // 4. Pencocokan kata kunci dari teks combo (grup A-E), sebagai fallback terakhir
    let adminPct = null;
    let mallPaymentPct = 0;

    const produkTarif = window.__selectedProdukTarif;
    if (produkTarif) {
        adminPct = status === 'mall' ? produkTarif.mall
            : status === 'star' ? produkTarif.star
            : produkTarif.nonStar;

        if (status === 'mall') {
            mallPaymentPct = Math.max(0, produkTarif.mall - produkTarif.nonStar);
        }
    }

    if (adminPct == null) {
        adminPct = getFashionAdminPct();
    }

    // jika ada kategori yang dipilih via autocomplete (DB), pakai tarif sesuai status
    const selKode = document.getElementById('kategori')?.value || window.__selectedKategoriKode;
    if (adminPct == null && selKode && selKode.startsWith('rate_')) {
        adminPct = SHOPEE_DB[selKode]?.admin?.[status] || 0;
    }

    if (adminPct == null) {
        adminPct = getAdminPctFromComboSelection();
    }

    if (adminPct == null) {
        adminPct = SHOPEE_DB[kat]?.admin['non-star'] || 0;
    }

    // Biaya Pembayaran khusus Shopee Mall (selisih tarif mall vs non-star), jika belum dihitung dari produkTarif di atas.
    if (status === 'mall' && !produkTarif) {
        const mallBase = SHOPEE_DB[kat]?.admin.mall || 0;
        mallPaymentPct = Math.max(0, mallBase - adminPct);
    }

    const activeFees = getActiveFeeItems();


    // Semua komponen biaya berbasis persentase (termasuk yang punya plafon nominal)
    let pctComponents = [
        { key: 'admin', pct: adminPct, cap: null },
        { key: 'mallPayment', pct: mallPaymentPct, cap: null },
        { key: 'ads', pct: adsPct, cap: null },
        ...activeFees
    ];

    const modalTotal = hpp + packing;
    const flatFeeBase = ORDER_PROCESSING_FEE + voucher; // komponen nominal tetap (tidak tergantung harga jual)

    let cappedAmount = {}; // key -> nominal tetap setelah plafon tercapai
    let hargaJual = 0;

    // Iterasi menyelesaikan plafon (cap): jika sebuah biaya % melebihi plafonnya,
    // biaya tsb dikonversi jadi nominal tetap lalu harga jual dihitung ulang.
    for (let iter = 0; iter < 8; iter++) {
        let pctSum = 0;
        let flatSum = flatFeeBase;
        pctComponents.forEach(c => {
            if (cappedAmount[c.key] !== undefined) {
                flatSum += cappedAmount[c.key];
            } else {
                pctSum += c.pct;
            }
        });
        let totalPctPotongan = pctSum / 100;
        if (totalPctPotongan >= 1) totalPctPotongan = 0.99;

        if (currentMode === 1) {
            let targetProfit = 0;
            if (profitType === 'persen') {
                targetProfit = (parseFloat(profitSlider) / 100) * modalTotal;
            } else {
                targetProfit = parseIDR(document.getElementById('target-val').value);
            }
            hargaJual = (modalTotal + targetProfit + flatSum) / (1 - totalPctPotongan);
        } else {
            hargaJual = parseIDR(document.getElementById('harga-jual-input').value);
        }

        let changed = false;
        pctComponents.forEach(c => {
            if (c.cap != null && cappedAmount[c.key] === undefined) {
                const amt = hargaJual * (c.pct / 100);
                if (amt > c.cap) {
                    cappedAmount[c.key] = c.cap;
                    changed = true;
                }
            }
        });
        if (!changed) break;
    }

    if (currentMode === 1) {
        hargaJual = applyRounding(hargaJual, rounding);
    }

    // Hitung nominal akhir tiap komponen biaya berdasarkan harga jual final
    function amountFor(c) {
        if (c.cap != null && cappedAmount[c.key] !== undefined) return c.cap;
        let amt = hargaJual * (c.pct / 100);
        if (c.cap != null && amt > c.cap) amt = c.cap;
        return amt;
    }

    const biayaAdmin = amountFor(pctComponents.find(c => c.key === 'admin'));
    const biayaPembayaranMall = amountFor(pctComponents.find(c => c.key === 'mallPayment'));
    const biayaAds = amountFor(pctComponents.find(c => c.key === 'ads'));

    const feeBreakdown = activeFees.map(f => ({
        label: f.label,
        group: f.group,
        pct: f.pct,
        cap: f.cap,
        amount: amountFor(f)
    }));

    const totalBiayaOpsional = feeBreakdown.reduce((sum, f) => sum + f.amount, 0);
    const totalPotonganShopee = biayaAdmin + biayaPembayaranMall + biayaAds + ORDER_PROCESSING_FEE + totalBiayaOpsional;

    const danaDiterima = hargaJual - totalPotonganShopee - voucher;
    const profitBersih = danaDiterima - modalTotal;
    const margin = hargaJual > 0 ? (profitBersih / hargaJual) * 100 : 0;

    const effectivePctSum = (biayaAdmin + biayaPembayaranMall + biayaAds + totalBiayaOpsional) / (hargaJual || 1);
    const bepPrice = effectivePctSum < 1
        ? (modalTotal + ORDER_PROCESSING_FEE + voucher) / (1 - effectivePctSum)
        : modalTotal + ORDER_PROCESSING_FEE + voucher;

    const resultData = {
        hargaJual,
        profitBersih,
        danaDiterima,
        biayaAdmin,
        biayaPembayaranMall,
        biayaAds,
        orderProcessingFee: ORDER_PROCESSING_FEE,
        feeBreakdown,
        totalPotonganShopee,
        voucher,
        modalTotal,
        margin,
        bepPrice,
        adminPct,
        mallPaymentPct,
        adsPct,
        status
    };

    // Disimpan secara global (tidak memengaruhi kalkulasi) supaya bisa dipakai
    // oleh fitur "Simpan Simulasi" (js/simulations.js) tanpa mengubah logika di atas.
    window.__lastSimResult = {
        ...resultData,
        kategoriKode: kat,
        mode: currentMode,
        profitType,
        profitSlider,
        targetValRaw: document.getElementById('target-val').value
    };

    updateUI(resultData);
}

function formatIDR(num) {
    return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

function parseIDR(str) {
    return parseInt(str.toString().replace(/\D/g, "")) || 0;
}

function applyRounding(price, type) {
    price = Math.ceil(price);
    switch (type) {
        case '100': return Math.ceil(price / 100) * 100;
        case '500': return Math.ceil(price / 500) * 500;
        case '1000': return Math.ceil(price / 1000) * 1000;
        case '900': return Math.floor(price / 1000) * 1000 + 900;
        case '990': return Math.floor(price / 1000) * 1000 + 990;
        default: return price;
    }
}

function switchMode(mode) {
    currentMode = mode;
    const tab1 = document.getElementById('tab-mode1');
    const tab2 = document.getElementById('tab-mode2');
    const inputHarga = document.getElementById('price-input-container');
    const inputTarget = document.getElementById('target-profit-section');

    if (mode === 1) {
        tab1.className = "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active-tab bg-shopee text-white shadow-sm";
        tab2.className = "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 text-neutral-500 hover:text-neutral-800";
        inputHarga.classList.add('hidden');
        inputTarget.classList.remove('hidden');
    } else {
        tab2.className = "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active-tab bg-shopee text-white shadow-sm";
        tab1.className = "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 text-neutral-500 hover:text-neutral-800";
        inputHarga.classList.remove('hidden');
        inputTarget.classList.add('hidden');
    }
    calculate();
}

function row(label, amount, opts = {}) {
    const { cls = 'text-red-500 pl-3 border-l-2 border-orange-400', prefix = '-Rp', bold = false } = opts;
    return `
        <div class="receipt-item ${cls}">
            <span class="receipt-label${bold ? ' font-bold' : ''}">${label}</span>
            <span class="receipt-value${bold ? ' font-bold' : ''}">${prefix} ${formatIDR(Math.abs(amount))}</span>
        </div>`;
}

function updateUI(data) {
    document.getElementById('res-harga-jual').innerText = `Rp ${formatIDR(data.hargaJual)}`;
    document.getElementById('res-profit').innerText = `Rp ${formatIDR(data.profitBersih)}`;
    document.getElementById('res-dana').innerText = `Rp ${formatIDR(data.danaDiterima)}`;
    document.getElementById('res-margin').innerText = `${data.margin.toFixed(1)}%`;
    document.getElementById('res-bep').innerText = `Rp ${formatIDR(data.bepPrice)}`;

    document.getElementById('sim-10').innerText = `Rp ${formatIDR(data.hargaJual / 0.9)}`;
    document.getElementById('sim-20').innerText = `Rp ${formatIDR(data.hargaJual / 0.8)}`;
    document.getElementById('sim-30').innerText = `Rp ${formatIDR(data.hargaJual / 0.7)}`;

    let rows = '';
    rows += `
        <div class="receipt-item text-neutral-700">
            <span class="receipt-label font-bold">Harga Jual Produk ke Pembeli</span>
            <span class="receipt-value font-bold">Rp ${formatIDR(data.hargaJual)}</span>
        </div>`;

    rows += row(`Biaya Administrasi (${data.adminPct.toFixed(2).replace(/\.00$/, '').replace(/\.?0$/, '')}%)`, data.biayaAdmin);

    if (data.status === 'mall' && data.mallPaymentPct > 0) {
        rows += row(`Biaya Pembayaran (Shopee Mall, ${data.mallPaymentPct.toFixed(2).replace(/\.00$/, '').replace(/\.?0$/, '')}%)`, data.biayaPembayaranMall);
    }

    rows += row(`Biaya Proses Pesanan (flat/transaksi)`, data.orderProcessingFee);

    if (data.adsPct > 0) {
        rows += row(`Biaya Kampanye Iklan (${data.adsPct}%)`, data.biayaAds);
    }

    data.feeBreakdown.forEach(f => {
        const pctLabel = f.pct.toFixed(2).replace(/\.00$/, '').replace(/\.?0$/, '');
        const capLabel = f.cap != null ? `, maks Rp${formatIDR(f.cap)}` : '';
        rows += row(`${f.label} (${pctLabel}%${capLabel})`, f.amount);
    });

    if (data.voucher > 0) {
        rows += row(`Voucher Diskon Toko`, data.voucher);
    }

    rows += row(`Total Potongan Shopee`, data.totalPotonganShopee + data.voucher, { cls: 'text-red-600 font-bold border-t border-neutral-200 pt-2 mt-1', bold: true });

    rows += `
        <div class="receipt-item text-[#2563EB] font-bold bg-blue-50/60 px-3 py-2 rounded-lg my-1">
            <span class="receipt-label">Jumlah Bersih Diterima</span>
            <span class="receipt-value">Rp ${formatIDR(data.danaDiterima)}</span>
        </div>`;

    rows += row(`Total Modal Pokok (HPP + Packing)`, data.modalTotal, { cls: 'text-neutral-500 pl-3' });

    rows += `
        <div class="receipt-item ${data.profitBersih >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} font-extrabold text-sm px-3 py-2 rounded-lg mt-2 border border-neutral-200">
            <span class="receipt-label">Laba Bersih (Profit)</span>
            <span class="receipt-value">Rp ${formatIDR(data.profitBersih)}</span>
        </div>`;

    document.getElementById('receipt-rows').innerHTML = rows;
    updateChart(data);
}

function updateChart(data) {
    const ctx = document.getElementById('profitChart').getContext('2d');
    const totalPotongan = data.totalPotonganShopee + data.voucher;
    
    const hppVal = data.modalTotal || 0;
    const potVal = totalPotongan || 0;
    const prfVal = data.profitBersih > 0 ? data.profitBersih : 0;
    
    const chartData = {
        labels: ['HPP Modal', 'Potongan Shopee', 'Laba Bersih'],
        datasets: [{
            data: [hppVal, potVal, prfVal],
            backgroundColor: ['#969696', '#EE4D2D', '#10B981'],
            borderWidth: 1,
            borderColor: '#ffffff'
        }]
    };

    if (myChart) {
        myChart.data = chartData;
        myChart.update();
    } else {
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '70%'
            }
        });
    }
}

function copyPrice() {
    const priceText = document.getElementById('res-harga-jual').innerText;
    navigator.clipboard.writeText(priceText.replace(/\D/g, ""));
    showToast("Harga Jual berhasil disalin!");
}

function exportPDF() {
    // Guard: pustaka html2pdf gagal dimuat (CDN diblokir/offline) -> beri tahu user,
    // jangan diam-diam gagal seperti sebelumnya.
    if (typeof html2pdf === 'undefined') {
        console.error('[Export PDF] Pustaka html2pdf.js belum termuat. Cek koneksi internet atau ad-blocker.');
        showToast('Gagal memuat pustaka PDF. Periksa koneksi internet Anda, lalu muat ulang halaman.');
        return;
    }

    const element = document.getElementById('export-area');
    if (!element) {
        console.error('[Export PDF] Elemen #export-area tidak ditemukan di halaman.');
        showToast('Gagal mengekspor: area hasil kalkulasi tidak ditemukan.');
        return;
    }

    const opt = {
        margin: 10,
        filename: 'Kalkulasi_Profit_Shopee.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showToast('Menyiapkan PDF...');
    html2pdf().set(opt).from(element).save()
        .catch(err => {
            // Sebelumnya error di sini hilang begitu saja (silent fail).
            console.error('[Export PDF] Gagal membuat PDF:', err);
            showToast('Gagal membuat PDF: ' + (err?.message || 'terjadi kesalahan tak terduga.'));
        });
}

function exportExcel() {
    // Guard: pustaka SheetJS (XLSX) gagal dimuat (CDN diblokir/offline).
    if (typeof XLSX === 'undefined') {
        console.error('[Export Excel] Pustaka xlsx.js belum termuat. Cek koneksi internet atau ad-blocker.');
        showToast('Gagal memuat pustaka Excel. Periksa koneksi internet Anda, lalu muat ulang halaman.');
        return;
    }

    try {
        const data = [
            ["Komponen Analisis Keuangan Shopee", "Nilai Nominal"],
            ["Harga Jual Ideal", document.getElementById('res-harga-jual').innerText],
            ["Keuntungan Bersih", document.getElementById('res-profit').innerText],
            ["Dana Pelepasan Net", document.getElementById('res-dana').innerText],
            ["Batas BEP Produk", document.getElementById('res-bep').innerText],
            ["Rasio Margin", document.getElementById('res-margin').innerText]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.book_append_sheet(wb, ws, "Struk Profit");
        XLSX.writeFile(wb, "Analisis_Profit_Shopee.xlsx");
        showToast('Excel berhasil diunduh!');
    } catch (err) {
        // Sebelumnya error di sini hilang begitu saja (silent fail).
        console.error('[Export Excel] Gagal membuat Excel:', err);
        showToast('Gagal membuat Excel: ' + (err?.message || 'terjadi kesalahan tak terduga.'));
    }
}


function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    }, 50);

    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

function resetForm() {
    document.getElementById('hpp').value = "0";
    document.getElementById('packing').value = "0";
    document.getElementById('target-val').value = "0";
    if(document.getElementById('harga-jual-input')) document.getElementById('harga-jual-input').value = "0";

    ['gongkir-xtra', 'cashback-xtra', 'video-xtra', 'live-xtra', 'asuransi-pengiriman'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    ['komisi-xtra-pct', 'komisi-xtra-plus-pct', 'ads-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "0";
    });
    const voucherEl = document.getElementById('voucher-nominal');
    if (voucherEl) voucherEl.value = "0";

    calculate();
    showToast("Formulir telah di-reset!");
}