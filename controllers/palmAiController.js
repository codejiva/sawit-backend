// controllers/palmAiController.js
const axios = require('axios');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User'); // Kita butuh ini untuk asosiasi

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System Prompt untuk ngasih "kepribadian" ke AI kita
const SYSTEM_PROMPT = `
Halo! Saya Palm-AI, asisten cerdas Anda untuk manajemen perkebunan kelapa sawit.
Saya dapat membantu optimisasi produksi, pemantauan kesehatan tanaman, perencanaan panen, dan analisis data.
Jawablah pertanyaan secara profesional, fokus pada konteks perkebunan kelapa sawit.
Jika pertanyaan di luar topik sawit, ingatkan user dengan sopan.
Gunakan Bahasa Indonesia.
`;

// --- 1. Fungsi untuk CHAT BARU / MELANJUTKAN CHAT ---
exports.postNewChat = async (req, res) => {
    const { prompt, conversationId } = req.body;
    const userId = req.user.id; // Didapat dari middleware 'protect'

    if (!prompt) {
        return res.status(400).json({ message: "Prompt tidak boleh kosong." });
    }

    try {
        let conversation;

        // Cek apakah ini chat lanjutan atau chat baru
        if (conversationId) {
            // Ini chat lanjutan. Cari chatnya dan pastikan milik user ini.
            conversation = await Conversation.findOne({ where: { id: conversationId, userId: userId } });
            if (!conversation) {
                return res.status(404).json({ message: "Percakapan tidak ditemukan." });
            }
        } else {
            // Ini chat baru. Buat percakapan baru.
            // Ambil 50 karakter pertama dari prompt sebagai judul
            const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
            conversation = await Conversation.create({
                userId: userId,
                title: title
            });
        }

        // 1. Simpan pesan dari USER ke database
        await Message.create({
            conversationId: conversation.id,
            role: 'user',
            content: prompt
        });

        // 2. Ambil history chat sebelumnya (maksimal 10 pesan terakhir)
        const history = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'ASC']],
            limit: 10
        });

        // Format pesan untuk API Groq (System Prompt + History)
        const messagesForGroq = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        // 3. Panggil API GROQ
        const groqResponse = await axios.post(
            GROQ_API_URL,
            {
                model: 'llama-3.1-8b-instant', // Model yang cepat dan gratis
                messages: messagesForGroq,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = groqResponse.data.choices[0].message.content;

        // 4. Simpan balasan dari AI ke database
        await Message.create({
            conversationId: conversation.id,
            role: 'model',
            content: aiResponse
        });

        // 5. Kirim balasan ke frontend
        res.status(200).json({
            reply: aiResponse,
            conversationId: conversation.id
        });

    } catch (error) {
        console.error('Groq API error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Gagal menghubungi Palm-AI.' });
    }
};


// --- 2. Fungsi untuk AMBIL SEMUA JUDUL CHAT (History) ---
exports.getChatHistory = async (req, res) => {
    try {
        const conversations = await Conversation.findAll({
            where: { userId: req.user.id },
            order: [['updatedAt', 'DESC']] // Tampilkan yang terbaru di atas
        });
        res.status(200).json(conversations);
    } catch (error) {
        console.error('GetHistory error:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat chat.' });
    }
};


// --- 3. Fungsi untuk AMBIL ISI PESAN DARI 1 CHAT ---
exports.getChatMessages = async (req, res) => {
    const { id } = req.params; // Ini adalah conversationId
    const userId = req.user.id;

    try {
        // Cek dulu apakah user ini pemilik chatnya
        const conversation = await Conversation.findOne({ where: { id: id, userId: userId } });
        if (!conversation) {
            return res.status(404).json({ message: "Percakapan tidak ditemukan." });
        }

        // Ambil semua pesan
        const messages = await Message.findAll({
            where: { conversationId: id },
            order: [['createdAt', 'ASC']] // Urutkan dari yang paling lama
        });
        
        res.status(200).json(messages);
    } catch (error) {
        console.error('GetMessages error:', error);
        res.status(500).json({ message: 'Gagal mengambil isi percakapan.' });
    }
};