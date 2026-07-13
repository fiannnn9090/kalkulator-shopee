require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const { testConnection } = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware dasar =====
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session sederhana (tanpa OAuth/JWT sesuai kebutuhan).
// Catatan: store default adalah MemoryStore, cukup untuk development.
// Untuk production, pertimbangkan store lain seperti express-mysql-session.
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
}));

// ===== Routes =====
app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Kalkulator Shopee API berjalan.' });
});

// ===== Error handling (harus di paling bawah) =====
app.use(notFound);
app.use(errorHandler);

// ===== Start server =====
async function start() {
    await testConnection();
    app.listen(PORT, () => {
        console.log(`[SERVER] Berjalan di http://localhost:${PORT}`);
    });
}

start();
