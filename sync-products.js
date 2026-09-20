const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const username = process.env.DIGIFLAZZ_USERNAME;
const apiKey = process.env.DIGIFLAZZ_KEY; // Bisa disesuaikan dengan DIGIFLAZZ_API_KEY_PRODUCTION

// Membuat signature MD5 sesuai dokumentasi Digiflazz
const sign = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');

const data = JSON.stringify({
    cmd: "prepaid",
    username: username,
    sign: sign
});

const options = {
    hostname: 'api.digiflazz.com',
    port: 443,
    path: '/v1/price-list',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(responseBody);
            if (parsed && parsed.data) {
                fs.writeFileSync('products.json', JSON.stringify(parsed.data, null, 2));
                console.log('Berhasil memperbarui products.json!');
            } else {
                console.log('Gagal mendapatkan data:', responseBody);
                process.exit(1);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('Error request API:', error);
    process.exit(1);
});

req.write(data);
req.end();
