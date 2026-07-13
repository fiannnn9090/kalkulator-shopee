# Kalkulator Pintar Profit Shopee Indonesia

Aplikasi bantu seller Shopee menghitung harga jual ideal dan estimasi profit bersih, sedang dikembangkan dari static web app menjadi aplikasi full-stack (dashboard, history, login) bergaya Shopee Seller Center.

> Status: **Tahap 3 - Simpan Simulasi (CRUD) & Riwayat selesai.**
> Fitur & tampilan kalkulator existing tetap sama; kalkulasi murni tidak diubah, hanya ditambahkan cara menyimpan hasilnya.

## Struktur Folder

```
kalkulator-shopee-main/
├── Frontend/           # App lama (HTML/CSS/JS) - dipindah, TIDAK diubah
│   ├── index.html         # + tombol "Simpan Simulasi", nav Dashboard/Riwayat
│   ├── script.js           # kalkulasi TIDAK diubah, cuma expose hasil ke window
│   ├── style.css
│   ├── login.html
│   ├── dashboard.html
│   ├── history.html       # BARU - halaman Riwayat (cari/filter/sort/edit/hapus)
│   └── js/
│       ├── auth.js         # helper fetch (GET/POST/PUT/DELETE) + cek sesi
│       ├── simulations.js  # BARU - modal simpan simulasi ke backend
│       └── history.js      # BARU - render tabel riwayat, edit, hapus
├── Backend/             # REST API baru (Express + MySQL)
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── config/       # koneksi database
│       ├── routes/       # index.js, authRoutes.js, simulationRoutes.js
│       ├── controllers/  # authController.js, simulationController.js
│       ├── models/       # userModel, storeModel, categoryModel, simulationModel
│       ├── middleware/   # auth, error handler
│       └── utils/        # helper (asyncHandler, response formatter)
├── Database/
│   └── schema.sql        # skema lengkap + seed data kategori
├── Assets/               # tempat screenshot/gambar untuk README nanti
└── README.md
```

## Tech Stack

- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript, Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MySQL (`mysql2`)
- **Auth:** Session sederhana (username + password, tanpa OAuth/JWT)

## Cara Menjalankan

### 1. Database
Instalasi baru (belum pernah import schema sebelumnya):
```bash
mysql -u root -p < Database/schema.sql
```
Kalau sebelumnya sudah pernah import schema.sql di Tahap 1/2, jalankan migrasi kecil ini juga
(ada perubahan nama kolom `bep_unit` → `bep_harga`):
```bash
mysql -u root -p < Database/migration_tahap3.sql
```

### 2. Backend
```bash
cd Backend
cp .env.example .env
# sesuaikan DB_USER, DB_PASSWORD, dll di file .env
npm install
npm run dev
```
Cek server berjalan: buka `http://localhost:5000/api/health` → harus muncul `"success": true`.

### 3. Frontend
Kalkulator (`index.html`) masih bisa dibuka langsung (standalone).
Untuk halaman **login.html** dan **dashboard.html**, sebaiknya dibuka lewat local server
(bukan double-click file), supaya cookie session dari backend bisa tersimpan dengan benar.
Cara termudah: pakai ekstensi **Live Server** di VS Code, lalu buka
`http://localhost:5500/login.html`.

> Kalau port Live Server bukan 5500, sesuaikan `CORS_ORIGIN` di file `.env` Backend.

Alur: `login.html` (daftar akun baru atau login) → berhasil → redirect ke `dashboard.html`
(otomatis cek sesi, kalau belum login akan ditendang balik ke `login.html`).

## Roadmap Pengembangan

- [x] Tahap 1 — Restrukturisasi folder, skeleton backend, skema database
- [x] Tahap 2 — Login (username/password), register, session, & halaman login
- [x] Tahap 3 — Simpan simulasi ke database (CRUD) & History
- [ ] Tahap 4 — Dashboard (statistik, grafik profit & margin)
- [x] Tahap 5 — Profil Toko & Pengaturan (biaya admin, voucher, ongkir)
- [ ] Tahap 6 — Export PDF/Excel, toast notification, validasi, loading state
- [x] Tahap 7 — Polish UI ala Shopee Seller Center, dark mode, README final


## API Endpoint (sejauh ini)

| Method | Endpoint            | Keterangan                                  |
|--------|---------------------|-----------------------------------------------|
| GET    | `/api/health`       | Cek server & koneksi database aktif           |
| POST   | `/api/auth/register` | Daftar akun baru (otomatis dapat toko default) |
| POST   | `/api/auth/login`    | Login, membuat session                        |
| POST   | `/api/auth/logout`   | Logout, menghapus session                     |
| GET    | `/api/auth/me`        | Cek user yang sedang login (perlu session)    |
| POST   | `/api/simulations`      | Simpan hasil kalkulator sebagai simulasi baru |
| GET    | `/api/simulations`      | List riwayat (support `q`, `status`, `sort`, `dir`, `page`, `limit`) |
| GET    | `/api/simulations/:id`  | Detail 1 simulasi                              |
| PUT    | `/api/simulations/:id`  | Edit simulasi                                  |
| DELETE | `/api/simulations/:id`  | Hapus simulasi                                 |

Semua endpoint `/api/simulations/*` butuh sesi login (session cookie).
Endpoint lain akan bertambah setiap tahap selesai.

## Fitur Tahap 3

- Di halaman kalkulator (`index.html`), setelah menghitung, klik **"Simpan Simulasi ke Riwayat"** →
  isi nama produk → tersimpan ke database, terhubung ke akun & toko yang sedang login.
- Status simulasi dihitung otomatis pakai **aturan sederhana (rule-based, bukan AI)**:
  harga jual ≤ modal → *Harga Terlalu Rendah*; margin < 10% → *Margin Rendah*;
  profit bersih < Rp 1.000 → *Profit Sangat Kecil*; selain itu → *Aman*.
- Halaman **`history.html`** menampilkan seluruh riwayat: cari nama produk, filter status, urutkan,
  pagination, serta bisa mengganti nama produk (edit) atau menghapus simulasi.

## Author

Fian — Teknik Informatika, Universitas Dian Nuswantoro
