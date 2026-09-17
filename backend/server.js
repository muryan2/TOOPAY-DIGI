const express = require('express');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Proxy Webshare (IP Statis Anda)
const PROXY_URL = 'http://gcnzwwca:arsurfginyhc@142.111.67.146:5611';
const agent = new HttpsProxyAgent(PROXY_URL);

app.post('/api/transaksi', async (req, res) => {
    try {
        const { buyer_sku_code, customer_no, ref_id } = req.body;
        
        // Konsisten menggunakan DIGIFLAZZ_KEY
        const username = process.env.DIGIFLAZZ_USERNAME;
        const secretKey = process.env.DIGIFLAZZ_KEY;

        if (!username || !secretKey) {
            return res.status(500).json({ status: "error", error: "Konfigurasi DIGIFLAZZ_USERNAME atau DIGIFLAZZ_KEY belum diatur di Render." });
        }

        const signData = username + secretKey + ref_id;
        const signature = crypto.createHash('md5').update(signData).digest('hex');

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
