// controllers/estimasiController.js
const Prediksi = require('../models/Prediksi');
const Lahan = require('../models/Lahan'); // Kita butuh Lahan untuk validasi

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

// --- (Nanti kita tambahkan fungsi GET /summary dan GET /history di sini) ---