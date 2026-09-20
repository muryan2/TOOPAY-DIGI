require('dotenv').config();                           
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');

const USERNAME = process.env.DIGIFLAZZ_USERNAME;
const API_KEY = process.env.DIGIFLAZZ_KEY;

async function fetchDigiflazzPricelist() {
    try {
        // Disamakan menggunakan kata kunci 'depo' agar sinkron dengan index.js Anda
        const sign = crypto
            .createHash('md5')
            .update(USERNAME + API_KEY + 'depo')
            .digest('hex');

        const payload = {                                         
            cmd: 'pricelist',
            username: USERNAME,
            sign: sign
        };

        console.log("Mengambil data produk dari Digiflazz...");
        const response = await axios.post('https://api.digiflazz.com/v1/price-list', payload);

        const result = response.data;

        if (result && result.data) {
            fs.writeFileSync('products.json', JSON.stringify(result.data, null, 2));
            console.log(`Sukses! ${result.data.length} produk berhasil disimpan ke products.json`);
        } else {
            console.log("Gagal mengambil data, respon:", result);
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.response?.data || error.message);
    }
}

fetchDigiflazzPricelist();
