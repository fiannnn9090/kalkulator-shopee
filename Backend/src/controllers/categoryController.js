const asyncHandler = require('../utils/asyncHandler');
const { pool } = require('../config/db');

// GET /api/categories/suggestions?q=&limit=&status=
// - q: keyword (kategori/jenis produk)
// - limit: default 10, max 25
// - status: non-star|star|mall (untuk memilih tarif persentase yang akan ditampilkan)
//
// Catatan:
// - Saat ini tabel `categories` di repo hanya punya kolom tarif per status.
// - Struktur label detail ("Kategori - Sub - Jenis") akan dibuat dari kolom nama.
// - Untuk integrasi data resmi Shopee 2026 (~80+ sub-kategori), kolom tambahan
//   seperti big_category/sub_category/jenis_produk bisa ditambahkan saat seed dimigrasikan.
const getSuggestions = asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(25, Math.max(1, Number(req.query.limit) || 10));
    const status = (req.query.status || 'non-star').toString();

    const statusCol =
        status === 'mall' ? 'tarif_mall' :
        status === 'star' ? 'tarif_star' : 'tarif_non_star';


    // Jika skema Shopee 2026 sudah diimport, gunakan tabel `shopee_dataset_2026`.
    // Struktur sesuai feedback Anda:
    //  category, subcategory, product, tarif_non_star/tarif_star/tarif_mall, slug, keywords

    const params = [];
    const where = [];

    if (q) {
        // Cari dari category/subcategory/product + keywords/slug
        where.push('(category LIKE ? OR subcategory LIKE ? OR product LIKE ? OR slug LIKE ? OR keywords LIKE ?)');
        params.push(
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`
        );
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // fallback: jika tabel shopee_dataset_2026 belum ada/ belum terisi,
    // kembalikan data lama dari tabel categories agar UI tetap berfungsi.
    let rows = [];
    try {
        const [dbRows] = await pool.query(
            `SELECT
                id,
                category,
                subcategory,
                product,
                tarif_non_star,
                tarif_star,
                tarif_mall,
                ${statusCol} AS tarif_aktif
             FROM shopee_dataset_2026
             ${whereClause}
             ORDER BY tarif_aktif DESC, tarif_non_star DESC
             LIMIT ?`,
            [...params, limit]
        );
        rows = dbRows;
    } catch (err) {
        // fallback tabel lama: categories
        const fallbackLimit = limit;
        const fallbackParams = [];
        let fallbackWhere = '';
        if (q) {
            fallbackWhere = 'WHERE nama LIKE ? OR kode LIKE ?';
            fallbackParams.push(`%${q}%`, `%${q}%`);
        }

        const [dbRows] = await pool.query(
            `SELECT
                id,
                kode,
                nama,
                tarif_non_star,
                tarif_star,
                tarif_mall,
                ${statusCol} AS tarif_aktif
             FROM categories
             ${fallbackWhere}
             ORDER BY tarif_aktif DESC, tarif_non_star DESC
             LIMIT ?`,
            [...fallbackParams, fallbackLimit]
        );

        rows = dbRows.map(r => ({
            id: r.id,
            category: r.nama,
            subcategory: '—',
            product: r.nama,
            tarif_non_star: r.tarif_non_star,
            tarif_star: r.tarif_star,
            tarif_mall: r.tarif_mall,
            tarif_aktif: r.tarif_aktif,
            kode: r.kode
        }));
    }


    const items = rows.map(r => {
        const label = `${r.category} - ${r.subcategory} - ${r.product}`;
        return {
            kategoriKode: `item_${r.id}`,
            label,
            pct: Number(r.tarif_aktif) || 0,
            // Dikirim sekaligus agar frontend bisa recalculate saat status
            // (non-star/star/mall) diganti TANPA perlu fetch ulang ke backend.
            pctNonStar: Number(r.tarif_non_star) || 0,
            pctStar: Number(r.tarif_star) || 0,
            pctMall: Number(r.tarif_mall) || 0
        };
    });


    return res.json({
        success: true,
        data: { items }
    });
});

module.exports = { getSuggestions };

