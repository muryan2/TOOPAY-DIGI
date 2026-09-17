const express = require('express');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Proxy Webshare (Sesuai skrip uji coba awal)
const PROXY_URL = 'http://gcnzwwca:arsurfginyhc@31.59.20.176:6754';
const agent = new HttpsProxyAgent(PROXY_URL);

app.post('/api/transaksi', async (req, res) => {
    try {
        const { buyer_sku_code, customer_no, ref_id } = req.body;
        
        const username = process.env.DIGIFLAZZ_USERNAME;
        const secretKey = process.env.DIGIFLAZZ_KEY;

        if (!username || !secretKey) {
            return res.status(500).json({ status: "error", error: "Konfigurasi DIGIFLAZZ_USERNAME atau DIGIFLAZZ_KEY belum diatur." });
        }

        const signData = username + secretKey + ref_id;
        const signature = crypto.createHash('md5').update(signData).digest('hex');

        // Eksekusi request nembak ke Digiflazz lewat proxy Webshare
        const response = await fetch('https://api.digiflazz.com/v1/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: agent, 
            body: JSON.stringify({
                username: username,
                buyer_sku_code,
                customer_no,
                ref_id,
                sign: signature,
                testing: false
            })
        });

        const result = await response.json();
        res.json({ status: "success", data: result });

    } catch (err) {
        res.status(500).json({ status: "error", error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bridge aktif di port ${PORT}`);
});
