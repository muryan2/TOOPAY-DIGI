// Menggunakan library bawaan Node.js (Tidak perlu npm install tambahan)
const crypto = require('crypto');
const { ProxyAgent } = require('undici'); 

export default async function handler(req, res) {
    // Hanya izinkan metode POST untuk keamanan transaksi
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { buyer_sku_code, customer_no, ref_id } = req.body;

    // Ambil kredensial dari Environment Variables Vercel
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_API_KEY;

    // Ambil data Webshare dari Env Vercel
    const proxyUser = process.env.WEBSHARE_USER;
    const proxyPass = process.env.WEBSHARE_PASS;
    const proxyPort = process.env.WEBSHARE_PORT; // Port khusus dari IP pilihan Anda (misal: 10000)
    const proxyHost = process.env.WEBSHARE_IP_KHUSUS; // Nomor IP statis pilihan Anda (misal: 45.138.xx.xx)

    if (!username || !apiKey) {
        return res.status(500).json({ error: 'Konfigurasi server belum lengkap.' });
    }

    // Buat signature MD5 sesuai standar Digiflazz
    const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

    const payload = {
        username: username,
        buyer_sku_code: buyer_sku_code,
        customer_no: customer_no,
        ref_id: ref_id,
        sign: sign,
        testing: true // Ubah ke false jika nanti sudah siap transaksi uang asli
    };

    // Setup Agent Proxy untuk memaksa Vercel keluar lewat IP Webshare
    let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    // Mengunci jalur koneksi murni menggunakan 1 IP statis pilihan Anda
    if (proxyUser && proxyPass && proxyHost && proxyPort) {
        const proxyUrl = `http://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`;
        // Menyisipkan dispatcher proxy ke dalam fetch bawaan Vercel
        fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    } else {
        return res.status(500).json({ error: 'Konfigurasi proxy Webshare di Env Vercel belum lengkap.' });
    }

    try {
        // Tembak API Digiflazz dengan membawa opsi proxy
        const apiResponse = await fetch('https://api.digiflazz.com/v1/transaction', fetchOptions);

        const result = await apiResponse.json();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Gagal terhubung ke server provider PPOB: ' + error.message });
    }
}
