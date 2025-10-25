// controllers/estimasiController.js
const Prediksi = require('../models/Prediksi');
const Lahan = require('../models/Lahan');
const { sequelize } = require('../config/database')
const { Op } = require('sequelize')

// --- 1. Fungsi untuk NAMBAH DATA PREDIKSI DUMMY ---
exports.createDummyPrediksi = async (req, res) => {
    const { lahanId, bulan, prediksi, aktual, status } = req.body;
    const userId = req.user.id;

    if (!lahanId || !bulan || !prediksi) {
        return res.status(400).json({ message: "lahanId, bulan (YYYY-MM-DD), and prediksi are required." });
    }

    try {
        // Validasi kepemilikan lahan
        const lahan = await Lahan.findOne({ where: { id: lahanId, userId: userId } });
        if (!lahan) {
            return res.status(404).json({ message: "Lahan not found or not owned by user." });
        }

        let akurasi = null;
        if (aktual && prediksi) {
            akurasi = (parseFloat(aktual) / parseFloat(prediksi)) * 100;
        }

        // Buat data prediksi baru
        const newPrediksi = await Prediksi.create({
            lahanId: lahanId,
            bulan: bulan, // Format YYYY-MM-DD
            prediksi_ton_per_ha: parseFloat(prediksi),
            aktual_ton_per_ha: aktual ? parseFloat(aktual) : null,
            akurasi: akurasi ? parseFloat(akurasi.toFixed(1)) : null, // Bulatkan 1 desimal
            status_prediksi: status || (aktual ? 'Selesai' : 'Menunggu Aktual')
        });

        res.status(201).json({ message: "Dummy Prediksi created", prediksi: newPrediksi });

    } catch (error) {
        console.error('CreateDummyPrediksi error:', error);
        res.status(500).json({ message: "Server error creating dummy prediksi." });
    }
};

exports.getEstimasiSummary = async (req, res) => {
    const userId = req.user.id;

    try {
        // Hitung total lahan milik user
        const totalLahan = await Lahan.count({ where: { userId: userId } });

        // Ambil data prediksi TERBARU dari SEMUA lahan milik user
        // (Mirip logic di dashboard summary, tapi pakai tabel Prediksi)
        const latestPrediksiData = await Prediksi.findAll({
            attributes: [
                'lahanId',
                [sequelize.fn('MAX', sequelize.col('bulan')), 'maxBulan']
            ],
            include: [{
                model: Lahan,
                attributes: [],
                where: { userId: userId },
                required: true
            }],
            group: ['lahanId'],
            raw: true
        });

        let totalEstimasi = 0;
        let totalAkurasi = 0;
        let countAkurasi = 0;
        let blokTercakup = 0;

        if (latestPrediksiData.length > 0) {
            blokTercakup = latestPrediksiData.length;

            const latestRecords = await Prediksi.findAll({
                where: {
                    [Op.or]: latestPrediksiData.map(item => ({
                        lahanId: item.lahanId,
                        bulan: item.maxBulan
                    }))
                },
                attributes: ['prediksi_ton_per_ha', 'akurasi']
            });

            latestRecords.forEach(record => {
                totalEstimasi += record.prediksi_ton_per_ha;
                if (record.akurasi !== null) {
                    totalAkurasi += record.akurasi;
                    countAkurasi++;
                }
            });
        }

        const akurasiRataRata = countAkurasi > 0 ? (totalAkurasi / countAkurasi) : 0;

        // Placeholder untuk Pembaruan Berikutnya (butuh logic cron job)
        const pembaruanBerikutnya = "3 hari"; // Contoh

        res.status(200).json({
            totalEstimasi: parseFloat(totalEstimasi.toFixed(1)), // 1 desimal
            akurasiRataRata: parseFloat(akurasiRataRata.toFixed(1)), // 1 desimal
            pembaruanBerikutnya: pembaruanBerikutnya,
            cakupanBlok: `${blokTercakup}/${totalLahan}`,
            persentaseCakupan: totalLahan > 0 ? Math.round((blokTercakup / totalLahan) * 100) : 0
        });

    } catch (error) {
        console.error('GetEstimasiSummary error:', error);
        res.status(500).json({ message: "Gagal mengambil summary estimasi." });
    }
};


// --- 3. Fungsi untuk GET HISTORY ESTIMASI (Tabel + Filter) ---
exports.getEstimasiHistory = async (req, res) => {
    const userId = req.user.id;
    // Ambil filter dari query params (?tahun=2025&bulan=10&blok=ID_LAHAN)
    const { tahun, bulan, blok } = req.query;

    try {
        let whereClause = {}; // Filter untuk tabel Prediksi
        let includeWhereClause = { userId: userId }; // Filter untuk tabel Lahan

        // Tambahkan filter jika ada di query params
        if (tahun) {
            // Filter berdasarkan tahun dari kolom 'bulan'
            whereClause[Op.and] = whereClause[Op.and] || [];
            whereClause[Op.and].push(sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM bulan')), tahun));
        }
        if (bulan) {
             // Filter berdasarkan bulan dari kolom 'bulan' (angka 1-12)
             whereClause[Op.and] = whereClause[Op.and] || [];
             whereClause[Op.and].push(sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM bulan')), bulan));
        }
        if (blok) {
             // Filter berdasarkan lahanId
            whereClause.lahanId = blok;
        }

        // Query data prediksi, join dengan Lahan untuk dapat nama blok
        const historyData = await Prediksi.findAll({
            where: whereClause,
            include: [{
                model: Lahan,
                attributes: ['name'], // Hanya ambil nama lahan
                where: includeWhereClause, // Filter berdasarkan userId
                required: true // INNER JOIN
            }],
            order: [['bulan', 'DESC'], [Lahan, 'name', 'ASC']], // Urutkan terbaru, lalu nama lahan
            // raw: true, // Hati-hati pakai raw: true jika ada include, bisa merusak struktur
            // nest: true // Gunakan nest jika tidak pakai raw
        });

         // Format data untuk tabel frontend
         const formattedData = historyData.map(item => ({
             blok: item.Lahan.name, // Ambil nama dari join
             tahun: new Date(item.bulan).getFullYear(),
             bulan: new Date(item.bulan).toLocaleString('id-ID', { month: 'long' }), // Format nama bulan (Januari, dll)
             estimasiTon: item.prediksi_ton_per_ha,
             aktualTon: item.aktual_ton_per_ha,
             akurasiPersen: item.akurasi,
             status: item.status_prediksi,
             // Placeholder 'Kepercayaan' dan 'Aksi' (ini lebih ke logic frontend)
             kepercayaan: item.akurasi ? (item.akurasi > 95 ? 'Tinggi' : (item.akurasi > 85 ? 'Sedang' : 'Rendah')) : 'N/A',
             prediksiId: item.id // Kirim ID prediksi untuk tombol aksi
         }));

        res.status(200).json(formattedData);

    } catch (error) {
        console.error('GetEstimasiHistory error:', error);
        res.status(500).json({ message: "Gagal mengambil history estimasi." });
    }
};