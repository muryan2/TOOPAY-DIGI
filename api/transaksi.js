export default async function handler(req, res) {
    // Hanya izinkan metode POST untuk keamanan transaksi
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { buyer_sku_code, customer_no, ref_id } = req.body;

    // Ambil kredensial dari Environment Variables Vercel (Nanti kita setting di Vercel)
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_API_KEY;

    if (!username || !apiKey) {
        return res.status(500).json({ error: 'Konfigurasi server belum lengkap.' });
    }

    // Buat signature MD5 sesuai standar Digiflazz (username + api_key + ref_id)
    const crypto = require('crypto');
    const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

    const payload = {
        username: username,
        buyer_sku_code: buyer_sku_code,
        customer_no: customer_no,
        ref_id: ref_id,
        sign: sign,
        testing: true // Ubah ke 'false' jika nanti sudah siap transaksi uang asli
    };

    try {
        const apiResponse = await fetch('https://api.digiflazz.com/v1/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await apiResponse.json();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Gagal terhubung ke server provider PPOB.' });
    }
}
