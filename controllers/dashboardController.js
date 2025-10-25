// controllers/dashboardController.js
const { sequelize } = require('../config/database');
const Lahan = require('../models/Lahan');
const Prediksi = require('../models/Prediksi'); // Kita butuh model Prediksi
const { Op } = require('sequelize');

// --- Fungsi untuk GET DATA SPASIAL (GeoJSON) ---
exports.getSpasialData = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Ambil semua lahan milik user
        //    Kita gunakan sequelize.fn('ST_AsGeoJSON', ...) untuk konversi geometry ke GeoJSON
        //    Kita juga join dengan tabel Prediksi untuk ambil prediksi TERBARU
        const lahanData = await Lahan.findAll({
            where: { userId: userId },
            attributes: [
                'id',
                'name',
                'lat', // Ambil lat/lon juga sebagai fallback jika geometry null
                'lon',
                // Konversi geometry ke GeoJSON string
                [sequelize.fn('ST_AsGeoJSON', sequelize.col('geometry')), 'geometryGeoJSON']
            ],
            include: [{
                model: Prediksi,
                attributes: ['bulan', 'prediksi_ton_per_ha', 'status_prediksi'],
                required: false, // Left join, agar lahan tanpa prediksi tetap muncul
                order: [['bulan', 'DESC']], // Ambil yang terbaru dulu
                limit: 1 // Hanya ambil 1 prediksi terbaru per lahan
            }],
            order: [['name', 'ASC']] // Urutkan berdasarkan nama lahan
        });

        // 2. Format hasil query menjadi GeoJSON FeatureCollection
        const features = lahanData.map(lahan => {
            let geometry = null;
            // Cek apakah geometryGeoJSON ada dan valid
            if (lahan.dataValues.geometryGeoJSON) {
                try {
                    geometry = JSON.parse(lahan.dataValues.geometryGeoJSON);
                } catch (e) {
                    console.warn(`Invalid GeoJSON for Lahan ${lahan.id}: ${lahan.dataValues.geometryGeoJSON}`);
                    // Fallback ke Point jika geometry polygon invalid atau null
                    if (lahan.lat && lahan.lon) {
                        geometry = { type: "Point", coordinates: [lahan.lon, lahan.lat] };
                    }
                }
            } else if (lahan.lat && lahan.lon) {
                 // Fallback ke Point jika geometry null
                 geometry = { type: "Point", coordinates: [lahan.lon, lahan.lat] };
            }

            // Ambil data prediksi terbaru (jika ada)
            const latestPrediksi = lahan.Prediksis && lahan.Prediksis.length > 0 ? lahan.Prediksis[0] : null;

            // Tentukan status produksi (contoh sederhana)
            let statusProduksi = 'Belum Ada Prediksi';
            if (latestPrediksi) {
                 if (latestPrediksi.prediksi_ton_per_ha > 30) statusProduksi = 'Produksi Tinggi';
                 else if (latestPrediksi.prediksi_ton_per_ha > 20) statusProduksi = 'Produksi Sedang';
                 else statusProduksi = 'Produksi Rendah';
            }


            return {
                type: "Feature",
                geometry: geometry, // GeoJSON object (Polygon atau Point)
                properties: {
                    lahanId: lahan.id,
                    name: lahan.name,
                    prediksiTerbaru: latestPrediksi ? latestPrediksi.prediksi_ton_per_ha : null,
                    bulanPrediksi: latestPrediksi ? latestPrediksi.bulan : null,
                    statusPrediksi: latestPrediksi ? latestPrediksi.status_prediksi : null,
                    // Tambahkan properti untuk styling peta (sesuai contoh dashboard)
                    statusProduksi: statusProduksi
                }
            };
        });

        const geoJsonOutput = {
            type: "FeatureCollection",
            features: features
        };

        res.status(200).json(geoJsonOutput);

    } catch (error) {
        console.error('GetSpasialData error:', error);
        res.status(500).json({ message: "Gagal mengambil data spasial." });
    }
};

// --- (Nanti kita tambahkan fungsi GET /summary dan GET /tren di sini) ---