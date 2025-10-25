// controllers/dashboardController.js
const { sequelize } = require('../config/database');
const Lahan = require('../models/Lahan');
const Prediksi = require('../models/Prediksi');
const DataHistoris = require('../models/DataHistoris')
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

exports.getSummaryData = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Ambil data NDVI terbaru dari SEMUA lahan milik user
        // Kita butuh subquery untuk mendapatkan bulan terbaru per lahan
        const latestNdviData = await DataHistoris.findAll({
            attributes: [
                'lahanId',
                [sequelize.fn('MAX', sequelize.col('bulan')), 'maxBulan']
            ],
            include: [{
                model: Lahan,
                attributes: [],
                where: { userId: userId },
                required: true // Pastikan hanya lahan milik user
            }],
            group: ['lahanId'],
            raw: true // Dapatkan hasil plain object
        });

        console.log("Hasil query latestNdviData:", JSON.stringify(latestNdviData, null, 2));

        if (latestNdviData.length === 0) {
            return res.status(200).json({ sektorKritis: 0, perluPerhatian: 0, sektorSehat: 0, penurunanNdvi10Persen: false });
        }

        // Ambil NDVI aktual dari bulan terbaru tersebut
        const latestRecords = await DataHistoris.findAll({
            where: {
                [Op.or]: latestNdviData.map(item => ({
                    lahanId: item.lahanId,
                    bulan: item.maxBulan
                }))
            },
            attributes: ['NDVI']
        });
        console.log("Hasil query latestRecords:", JSON.stringify(latestRecords, null, 2));

        // 2. Hitung jumlah berdasarkan kategori NDVI (contoh batas)
        let sektorKritis = 0;
        let perluPerhatian = 0;
        let sektorSehat = 0;

        latestRecords.forEach(record => {
            if (record.NDVI < 0.6) {
                sektorKritis++;
            } else if (record.NDVI < 0.75) {
                perluPerhatian++;
            } else {
                sektorSehat++;
            }
        });

        // 3. (Contoh) Cek penurunan NDVI > 10% (ini butuh logic lebih kompleks,
        //    misal bandingkan rata-rata NDVI bulan ini vs bulan lalu. Kita skip dulu)
        const penurunanNdvi10Persen = false; // Placeholder

        res.status(200).json({
            sektorKritis: sektorKritis,
            perluPerhatian: perluPerhatian,
            sektorSehat: sektorSehat,
            penurunanNdvi10Persen: penurunanNdvi10Persen
        });

    } catch (error) {
        console.error('GetSummaryData error:', error);
        res.status(500).json({ message: "Gagal mengambil data summary." });
    }
};


// --- Fungsi untuk GET TREND DATA (Production Chart) ---
exports.getTrendData = async (req, res) => {
    const userId = req.user.id;
    // Ambil rentang waktu dari query params (default 1 tahun terakhir)
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1);

    try {
        // Ambil data historis bulanan (rata-rata semua lahan user)
        const trendData = await DataHistoris.findAll({
            attributes: [
                [sequelize.fn('date_trunc', 'month', sequelize.col('bulan')), 'bulan_agg'], // Group per bulan
                [sequelize.fn('AVG', sequelize.col('produktivitas_ton_per_ha')), 'avg_produksi'] // Rata-rata produksi
            ],
            include: [{
                model: Lahan,
                attributes: [],
                where: { userId: userId },
                required: true
            }],
            where: {
                bulan: {
                    [Op.gte]: startDate, // >= 1 tahun lalu
                    [Op.lte]: endDate    // <= bulan ini
                }
            },
            group: [sequelize.fn('date_trunc', 'month', sequelize.col('bulan'))],
            order: [[sequelize.fn('date_trunc', 'month', sequelize.col('bulan')), 'ASC']], // Urutkan berdasarkan bulan
            raw: true
        });
        console.log("Hasil query trendData:", JSON.stringify(trendData, null, 2));

        // Format data untuk chart (misal: [{ month: '2024-01', value: 25.5 }, ...])
        const formattedData = trendData.map(item => ({
             // Format bulan jadi YYYY-MM
            month: new Date(item.bulan_agg).toISOString().substring(0, 7),
            value: parseFloat(item.avg_produksi.toFixed(2)) // Bulatkan 2 desimal
        }));


        res.status(200).json(formattedData);

    } catch (error) {
        console.error('GetTrendData error:', error);
        res.status(500).json({ message: "Gagal mengambil data tren." });
    }
};