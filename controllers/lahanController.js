// controllers/lahanController.js
const axios = require('axios');
const Lahan = require('../models/Lahan');
const DataHistoris = require('../models/DataHistoris');
const { Op } = require('sequelize'); // Kita butuh ini untuk query 'latest'

// URL API Python kita
const PYTHON_API_URL = 'http://localhost:8000/predict';

// --- 1. Fungsi untuk NAMBAH DATA LAHAN & HISTORIS DUMMY ---
// (Ini hanya untuk development/testing)
exports.createDummyLahan = async (req, res) => {
    // Kita hardcode aja datanya biar gampang
    try {
        // Buat lahan baru (anggap user yang login adalah pemiliknya)
        const newLahan = await Lahan.create({
            name: req.body.name || 'Lahan Dummy',
            userId: req.user.id, // req.user dari middleware 'protect'
            penanggung_jawab: req.body.penanggung_jawab || 'Tim A',
            jenis_tanah: req.body.jenis_tanah || 'Alluvial',
            sistem_irigasi: req.body.sistem_irigasi || 'Tanpa Irigasi',
            lahan_kabupaten: req.body.lahan_kabupaten || 'Kampar',
            lat: req.body.lat || -2.5,
            lon: req.body.lon || 102.5
        });

        // Buat 3 data historis dummy untuk lahan ini
        const today = new Date();
        const dates = [
            new Date(today.getFullYear(), today.getMonth() - 2, 1), // 2 bulan lalu
            new Date(today.getFullYear(), today.getMonth() - 1, 1), // 1 bulan lalu
            new Date(today.getFullYear(), today.getMonth(), 1)     // Bulan ini
        ];

        const dummyData = [
            { bulan: dates[0], NDVI: 0.72, pupuk_kg_per_ha: 135.0, umur_tanaman_tahun: 8.2, curah_hujan_mm: 210.0, suhu_rata2_c: 26.1, produktivitas_ton_per_ha: 2.0 },
            { bulan: dates[1], NDVI: 0.73, pupuk_kg_per_ha: 140.0, umur_tanaman_tahun: 8.3, curah_hujan_mm: 190.0, suhu_rata2_c: 26.8, produktivitas_ton_per_ha: 2.1 },
            { bulan: dates[2], NDVI: 0.75, pupuk_kg_per_ha: 150.0, umur_tanaman_tahun: 8.4, curah_hujan_mm: 220.0, suhu_rata2_c: 26.5, produktivitas_ton_per_ha: 2.2 } // Data terakhir
        ];

        for (const data of dummyData) {
            await DataHistoris.create({
                ...data,
                lahanId: newLahan.id
            });
        }

        res.status(201).json({ message: "Dummy Lahan created", lahan: newLahan });

    } catch (error) {
        console.error('CreateDummyLahan error:', error);
        res.status(500).json({ message: "Server error creating dummy lahan." });
    }
};


// --- 2. Fungsi UTAMA untuk PREDIKSI ---
exports.predictLahan = async (req, res) => {
    const { id } = req.params; // ID Lahan yang mau diprediksi
    const userId = req.user.id;

    try {
        // 1. Ambil info statis lahan (sekaligus validasi kepemilikan)
        const lahan = await Lahan.findOne({ where: { id: id, userId: userId } });
        if (!lahan) {
            return res.status(404).json({ message: "Lahan tidak ditemukan atau bukan milik Anda." });
        }

        // 2. Ambil 3 data historis TERBARU untuk lahan ini
        const history = await DataHistoris.findAll({
            where: { lahanId: id },
            order: [['bulan', 'DESC']], // Urutkan dari terbaru
            limit: 3
        });

        if (history.length === 0) {
            return res.status(400).json({ message: "Data historis tidak ditemukan untuk lahan ini." });
        }
        
        // Urutkan kembali dari terlama ke terbaru untuk perhitungan lag/roll
        history.sort((a, b) => new Date(a.bulan) - new Date(b.bulan)); 

        const latestData = history[history.length - 1]; // Data paling baru
        
        // Pastikan kita punya cukup data untuk lag1 (minimal 1 data)
        const lag1Data = history.length > 0 ? history[history.length - 1] : latestData; // Data terakhir
        
        // Data untuk rolling 3 (rata-rata dari history, atau data terakhir jika kurang)
        const rollingData = history.length > 0 ? history : [latestData];

        // 3. Siapkan payload JSON untuk API Python
        const payload = {
            instances: [
                {
                    NDVI: latestData.NDVI,
                    pupuk_kg_per_ha: latestData.pupuk_kg_per_ha,
                    umur_tanaman_tahun: latestData.umur_tanaman_tahun + (1 / 12.0), // Estimasi umur bulan depan
                    curah_hujan_mm: rollingData.reduce((sum, d) => sum + d.curah_hujan_mm, 0) / rollingData.length, // Rata2 curah hujan
                    suhu_rata2_c: rollingData.reduce((sum, d) => sum + d.suhu_rata2_c, 0) / rollingData.length, // Rata2 suhu
                    NDVI_lag1: lag1Data.NDVI,
                    pupuk_lag1: lag1Data.pupuk_kg_per_ha,
                    prod_lag1: lag1Data.produktivitas_ton_per_ha, // Produktivitas aktual terakhir
                    NDVI_roll3: rollingData.reduce((sum, d) => sum + d.NDVI, 0) / rollingData.length, // Rata2 NDVI
                    pupuk_roll3: rollingData.reduce((sum, d) => sum + d.pupuk_kg_per_ha, 0) / rollingData.length, // Rata2 pupuk
                    // Ambil data kategorikal dari tabel Lahan
                    penanggung_jawab: lahan.penanggung_jawab,
                    jenis_tanah: lahan.jenis_tanah,
                    sistem_irigasi: lahan.sistem_irigasi,
                    lahan_kabupaten: lahan.lahan_kabupaten
                }
            ]
        };

        // 4. Panggil API Python
        console.log("Sending payload to Python API:", JSON.stringify(payload, null, 2)); // Log payload
        const pythonResponse = await axios.post(PYTHON_API_URL, payload);

        // 5. Olah & kirim balasan
        if (pythonResponse.data && pythonResponse.data.predictions && pythonResponse.data.predictions.length > 0) {
            const prediction = pythonResponse.data.predictions[0];
            res.status(200).json({
                lahanId: id,
                predicted_productivity_ton_per_ha: prediction,
                // Kita sertakan juga data terakhir sebagai referensi
                last_actual_productivity: latestData.produktivitas_ton_per_ha,
                last_month: latestData.bulan
            });
        } else {
            throw new Error('Invalid response structure from Python API');
        }

    } catch (error) {
        console.error('PredictLahan error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Gagal mendapatkan prediksi.", error: error.message });
    }
};

// --- 3. (Opsional) Fungsi untuk GET SEMUA LAHAN ---
exports.getAllLahan = async (req, res) => {
    try {
        const allLahan = await Lahan.findAll({
            where: { userId: req.user.id }, // Hanya lahan milik user yg login
            order: [['name', 'ASC']]
        });
        res.status(200).json(allLahan);
    } catch (error) {
        console.error('GetAllLahan error:', error);
        res.status(500).json({ message: "Gagal mengambil daftar lahan." });
    }
};