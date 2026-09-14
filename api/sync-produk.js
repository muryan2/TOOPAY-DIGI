const crypto = require('crypto');
const { ProxyAgent } = require('undici'); 

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_API_KEY;

    const proxyUser = process.env.WEBSHARE_USER;
    const proxyPass = process.env.WEBSHARE_PASS;
    const proxyPort = process.env.WEBSHARE_PORT; 
    const proxyHost = process.env.WEBSHARE_IP_KHUSUS; 

    if (!username || !apiKey) {
        return res.status(500).json({ error: 'Konfigurasi server belum lengkap.' });
    }

    // TEPAT: Rumus signature khusus untuk penarikan produk (price-list)
    const sign = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');

    const payload = {
        username: username,
        sign: sign,
        cmd: 'prepaid' // Menarik produk prabayar (pulsa, token PLN, dll)
    };

    let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    if (proxyUser && proxyPass && proxyHost && proxyPort) {
        const proxyUrl = `http://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`;
        fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    } else {
        return res.status(500).json({ error: 'Konfigurasi proxy Webshare di Env Vercel belum lengkap.' });
    }

    try {
        // TEPAT: Sekarang skrip menembak ke endpoint price-list resmi Digiflazz
        const apiResponse = await fetch('https://digiflazz.com', fetchOptions);
        const result = await apiResponse.json();

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Gagal sinkronisasi produk: ' + error.message });
    }
}
