require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');

const {
    createOrder,
    getOrder,
    cleanupExpiredOrders,
    claimPendingOrderByAmount,
    updateOrder
} = require('./orders');

const { generateDynamicQRIS } = require('./qris');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.text({ type: ['text/plain', 'text/*'] }));

const PORT = process.env.PORT || 3000;

const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME;
const DIGIFLAZZ_KEY = process.env.DIGIFLAZZ_KEY;

const DIGIFLAZZ_URL = 'https://' + 'api.digiflazz.com/v1/price-list';
const DIGIFLAZZ_TRANSACTION_URL = 'https://' + 'api.digiflazz.com/v1/transaction';

const QRIS_MARGIN = 786;


/* ============================================================
   HELPER
============================================================ */

function md5(text) {
    return crypto
        .createHash('md5')
        .update(text)
        .digest('hex');
}

function generateRefId(prefix = 'TP') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeTarget(value) {
    return String(value || '').trim();
}

function getDigiflazzPriceListSign() {
    return md5(
        DIGIFLAZZ_USERNAME +
        DIGIFLAZZ_KEY +
        'pricelist'
    );
}

function getTransactionSign(refId) {
    return md5(
        DIGIFLAZZ_USERNAME +
        DIGIFLAZZ_KEY +
        refId
    );
}


/* ============================================================
   QRIS IMAGE
============================================================ */

async function generateQrisImageBuffer(qrisText) {
    try {
        const templatePath = path.join(
            __dirname,
            'template_qris.png'
        );

        if (!fs.existsSync(templatePath)) {
            console.error('template_qris.png tidak ditemukan');
            return null;
        }

        const metadata = await sharp(templatePath).metadata();

        const tw = metadata.width;
        const th = metadata.height;

        const targetWidth = Math.floor(tw * 0.60);
        const posX = Math.floor((tw - targetWidth) / 2);
        const posY = Math.floor(th * 0.315);

        const qrBuffer = await QRCode.toBuffer(qrisText, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width: targetWidth,
            type: 'png'
        });

        return await sharp(templatePath)
            .composite([
                {
                    input: qrBuffer,
                    top: posY,
                    left: posX
                }
            ])
            .png()
            .toBuffer();

    } catch (err) {
        console.error(
            'Gagal membuat gambar QRIS:',
            err.message
        );

        return null;
    }
}


/* ============================================================
   DIGIFLAZZ - PRICE LIST PREPAID
============================================================ */

app.get('/api/produk', async (req, res) => {
    try {
        if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_KEY) {
            return res.status(500).json({
                success: false,
                message: 'DIGIFLAZZ_USERNAME / DIGIFLAZZ_KEY belum tersedia'
            });
        }

        const payload = {
            cmd: 'prepaid',
            username: DIGIFLAZZ_USERNAME,
            sign: getDigiflazzPriceListSign()
        };

        const response = await axios.post(
            DIGIFLAZZ_URL,
            payload,
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.json({
            success: true,
            data: response.data.data || []
        });

    } catch (error) {
        console.error(
            'Gagal mengambil produk prepaid:',
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil produk Digiflazz'
        });
    }
});


/* ============================================================
   DIGIFLAZZ - PRICE LIST PASCABAYAR
============================================================ */

app.get('/api/produk-pasca', (req, res) => {
    try {
        const cachePath = path.join(__dirname, 'pasca.json');

        if (!fs.existsSync(cachePath)) {
            return res.status(404).json({
                success: false,
                message: 'Katalog pascabayar belum tersedia'
            });
        }

        const cached = JSON.parse(
            fs.readFileSync(cachePath, 'utf8')
        );

        /*
         * pasca.json harus berisi ARRAY produk.
         * Jika isinya respons error Digiflazz seperti rc 83,
         * jangan dianggap sebagai katalog.
         */
        if (!Array.isArray(cached) || !cached.length) {
            return res.status(503).json({
                success: false,
                message: 'Katalog pascabayar belum tersedia di cache'
            });
        }

        return res.json({
            success: true,
            source: 'cache',
            data: cached
        });

    } catch (error) {
        console.error(
            'Gagal membaca katalog pascabayar:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Gagal membaca katalog pascabayar'
        });
    }
});

/* ============================================================
   REFRESH KATALOG PASCABAYAR DARI DIGIFLAZZ
   Endpoint ini hanya dipanggil secara manual.
============================================================ */

app.post('/api/produk-pasca/refresh', async (req, res) => {
    try {
        if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_KEY) {
            return res.status(500).json({
                success: false,
                message: 'DIGIFLAZZ_USERNAME / DIGIFLAZZ_KEY belum tersedia'
            });
        }

        const payload = {
            cmd: 'pasca',
            username: DIGIFLAZZ_USERNAME,
            sign: getDigiflazzPriceListSign()
        };

        const response = await axios.post(
            DIGIFLAZZ_URL,
            payload,
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data?.data;

        /*
         * Jangan pernah menimpa cache dengan respons
         * seperti { rc: "83", message: "..." }.
         */
        if (!Array.isArray(data) || !data.length) {
            return res.status(503).json({
                success: false,
                message: data?.message ||
                    'Digiflazz tidak mengembalikan katalog pascabayar',
                rc: data?.rc || null
            });
        }

        const cachePath = path.join(__dirname, 'pasca.json');

        fs.writeFileSync(
            cachePath,
            JSON.stringify(data, null, 2),
            'utf8'
        );

        const activeProducts = data.filter(item =>
            item.buyer_product_status === true &&
            item.seller_product_status === true
        );

        console.log(
            `Katalog pascabayar tersimpan: ${data.length} produk, ` +
            `${activeProducts.length} aktif`
        );

        return res.json({
            success: true,
            message: 'Katalog pascabayar berhasil diperbarui',
            total: data.length,
            active: activeProducts.length,
            data
        });

    } catch (error) {
        console.error(
            'Gagal refresh katalog pascabayar:',
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil katalog pascabayar dari Digiflazz',
            error: error.response?.data || error.message
        });
    }
});

/* ============================================================
   DIGIFLAZZ - INQUIRY PASCABAYAR
============================================================ */

app.post('/api/inquiry-pasca', async (req, res) => {
    try {
        const {
            sku,
            customerNo,
            customer_no
        } = req.body || {};

        const finalSku = String(sku || '').trim();
        const finalCustomerNo = normalizeTarget(
            customerNo || customer_no
        );

        if (!finalSku || !finalCustomerNo) {
            return res.status(400).json({
                success: false,
                message: 'SKU dan nomor pelanggan wajib diisi'
            });
        }

        const refId = generateRefId('INQ');

        const payload = {
            commands: 'inq-pasca',
            username: DIGIFLAZZ_USERNAME,
            buyer_sku_code: finalSku,
            customer_no: finalCustomerNo,
            ref_id: refId,
            sign: getTransactionSign(refId)
        };

        const response = await axios.post(
            DIGIFLAZZ_TRANSACTION_URL,
            payload,
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = response.data || {};
        const data = result.data || {};

        console.log(
            `Inquiry pasca: ${finalSku} / ${finalCustomerNo} / ${data.status || result.status || '-'}`
        );

        return res.json({
            success: true,
            ref_id: refId,
            data
        });

    } catch (error) {
        console.error(
            'Inquiry pascabayar gagal:',
            error.response?.data || error.message
        );

        const responseData = error.response?.data;

        return res.status(500).json({
            success: false,
            message:
                responseData?.data?.message ||
                responseData?.message ||
                'Inquiry pascabayar gagal',
            data: responseData?.data || null
        });
    }
});


/* ============================================================
   CREATE ORDER + QRIS
   PREPAID DAN POSTPAID
============================================================ */

app.post('/api/order', async (req, res) => {
    try {
        const body = req.body || {};

        const {
            sku,
            productName,
            target,
            amount,
            whatsapp,

            // pascabayar
            isPostpaid,
            inquiryRefId,
            customerName,
            inquiryData
        } = body;

        if (!sku || !target || !amount) {
            return res.status(400).json({
                success: false,
                message: 'SKU, target, dan amount wajib diisi'
            });
        }

        const basePrice = Number(amount);

        if (!Number.isFinite(basePrice) || basePrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nominal pembayaran tidak valid'
            });
        }

        const postpaid = Boolean(isPostpaid);

        if (postpaid && !inquiryRefId) {
            return res.status(400).json({
                success: false,
                message: 'Inquiry pascabayar belum dilakukan'
            });
        }

        const margin = QRIS_MARGIN;

        const uniqueCode =
            Math.floor(Math.random() * 99) + 1;

        const numericAmount =
            basePrice +
            margin +
            uniqueCode;

        const qris = generateDynamicQRIS(
            numericAmount
        );

        const order = createOrder({
            sku,
            productName: productName || sku,
            target,
            amount: numericAmount,
            whatsapp: whatsapp || '',
            basePrice,
            margin,
            uniqueCode,

            isPostpaid: postpaid,
            inquiryRefId: inquiryRefId || null,
            customerName: customerName || '',
            inquiryData: inquiryData || null
        });

        const imageBuffer =
            await generateQrisImageBuffer(qris);

        const qrisImage = imageBuffer
            ? `data:image/png;base64,${imageBuffer.toString('base64')}`
            : null;

        return res.json({
            success: true,
            message: 'Order berhasil dibuat',

            order: {
                order_id: order.order_id,
                sku: order.sku,
                product_name: order.product_name,
                target: order.target,

                amount: order.amount,

                whatsapp: order.whatsapp,

                type: order.type,

                customer_name:
                    order.customer_name || '',

                inquiry_ref_id:
                    order.inquiry_ref_id || null,

                status: order.status,
                created_at: order.created_at,
                expires_at: order.expires_at
            },

            qris,
            qrisImage
        });

    } catch (error) {
        console.error(
            'Gagal membuat order:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Gagal membuat order'
        });
    }
});


/* ============================================================
   CEK STATUS ORDER
============================================================ */

app.get(
    '/api/order/status/:orderId',
    (req, res) => {
        try {
            const order =
                getOrder(req.params.orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order tidak ditemukan'
                });
            }

            return res.json({
                success: true,
                order
            });

        } catch (error) {
            console.error(
                'Gagal cek status:',
                error.message
            );

            return res.status(500).json({
                success: false,
                message: 'Gagal mengambil status order'
            });
        }
    }
);


/* ============================================================
   TEST ROUTE
============================================================ */

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'TOOPAY backend aktif'
    });
});


/* ============================================================
   SERVER
============================================================ */



/* ============================================================
   TOOPAY_MACRODROID_PAYMENT_V1
   MacroDroid -> pembayaran QRIS -> Digiflazz
   ============================================================ */

function normalizePaymentAmount(value) {
    const text = String(value || '').trim();

    if (!text) return 0;

    // Format Indonesia:
    // Rp12.345
    // Rp 12.345
    // 12.345
    // 12345
    const digits = text.replace(/[^0-9]/g, '');

    const amount = Number(digits);

    return Number.isFinite(amount) ? amount : 0;
}

function extractDanaPaymentAmount(payload) {
    let raw = payload;

    if (Buffer.isBuffer(raw)) {
        raw = raw.toString('utf8');
    }

    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch (_) {}
    }

    let text = '';

    if (raw && typeof raw === 'object') {
        text =
            raw.text ||
            raw.message ||
            raw.notification ||
            raw.notification_text ||
            raw.title ||
            JSON.stringify(raw);
    } else {
        text = String(raw || '');
    }

    text = String(text).trim();

    if (!text) return null;

    const upper = text.toUpperCase();

    /*
      Format utama yang kita terima:

      Rp12.345 diterima DANA Bisnis.
      Rp 12.345 diterima DANA Bisnis.

      Kita sengaja mensyaratkan "DITERIMA DANA BISNIS"
      supaya notifikasi lain tidak dianggap sebagai pembayaran.
    */
    const match = upper.match(
        /RP\s*([0-9.]+)\s+DITERIMA\s+DANA\s+BISNIS/
    );

    if (!match) {
        return null;
    }

    const amount = normalizePaymentAmount(match[1]);

    if (!amount || amount <= 0) {
        return null;
    }

    return {
        amount,
        raw: text
    };
}

async function sendDigiflazzTransaction(order) {
    if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_KEY) {
        throw new Error(
            'DIGIFLAZZ_USERNAME / DIGIFLAZZ_KEY belum tersedia'
        );
    }

    const isPostpaid =
        String(order.type || '').toUpperCase() === 'POSTPAID';

    let refId = '';

    if (isPostpaid) {
        refId = String(
            order.inquiry_ref_id || ''
        ).trim();

        if (!refId) {
            throw new Error(
                'Ref ID inquiry pascabayar tidak ditemukan'
            );
        }
    } else {
        refId =
            'TP-' +
            Date.now() +
            '-' +
            Math.random()
                .toString(36)
                .slice(2, 8)
                .toUpperCase();
    }

    const sign = getTransactionSign(refId);

    const payload = {
        username: DIGIFLAZZ_USERNAME,
        buyer_sku_code: String(order.sku || '').trim(),
        customer_no: String(order.target || '').trim(),
        ref_id: refId,
        sign
    };

    if (isPostpaid) {
        payload.commands = 'pay-pasca';
    }

    console.log(
        '📤 Mengirim transaksi Digiflazz:',
        isPostpaid ? 'pay-pasca' : 'prepaid',
        'SKU=' + payload.buyer_sku_code,
        'Target=' + payload.customer_no,
        'Ref=' + refId
    );

    const response = await axios.post(
        DIGIFLAZZ_TRANSACTION_URL,
        payload,
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const data = response.data?.data;

    if (!data || typeof data !== 'object') {
        throw new Error(
            'Respons Digiflazz tidak memiliki data transaksi'
        );
    }

    return {
        refId,
        data
    };
}

async function processPaidOrder(order) {
    if (!order) {
        return {
            success: false,
            message: 'Order tidak ditemukan'
        };
    }

    try {
        const result =
            await sendDigiflazzTransaction(order);

        const data = result.data;

        const status =
            String(data.status || '')
                .trim();

        const normalizedStatus =
            status.toUpperCase();

        let localStatus = 'PROCESSING';

        if (normalizedStatus === 'SUKSES') {
            localStatus = 'SUCCESS';
        } else if (normalizedStatus === 'GAGAL') {
            localStatus = 'FAILED';
        } else if (normalizedStatus === 'PENDING') {
            localStatus = 'PROCESSING';
        }

        const updated =
            updateOrder(
                order.order_id,
                {
                    status: localStatus,
                    processed_at:
                        new Date().toISOString(),
                    digiflazz_ref_id:
                        result.refId,
                    digiflazz_status:
                        status || null,
                    digiflazz_message:
                        data.message || null,
                    sn:
                        data.sn ||
                        null,
                    digiflazz_response:
                        data
                }
            );

        console.log(
            '📥 Respons Digiflazz:',
            status || 'UNKNOWN',
            data.rc || ''
        );

        return {
            success: true,
            order: updated,
            digiflazz: data
        };

    } catch (error) {

        console.error(
            '❌ Transaksi Digiflazz gagal diproses:',
            error.response?.data ||
            error.message
        );

        const updated =
            updateOrder(
                order.order_id,
                {
                    status: 'FAILED',
                    processed_at:
                        new Date().toISOString(),
                    digiflazz_message:
                        error.response?.data?.data?.message ||
                        error.response?.data?.message ||
                        error.message
                }
            );

        return {
            success: false,
            order: updated,
            message:
                error.response?.data?.data?.message ||
                error.response?.data?.message ||
                error.message
        };
    }
}


/* ============================================================
   WEBHOOK MACRODROID
   ============================================================ */

app.post(
    ['/webhook', '/api/webhook/macrodroid'],
    async (req, res) => {

        try {

            const payment =
                extractDanaPaymentAmount(req.body);

            if (!payment) {

                console.log(
                    '📩 MacroDroid diterima tetapi bukan pembayaran DANA Bisnis.'
                );

                return res.status(200).json({
                    success: false,
                    matched: false,
                    message:
                        'Notifikasi bukan pembayaran DANA Bisnis'
                });
            }

            console.log(
                '💰 Pembayaran DANA terdeteksi:',
                'Rp' +
                payment.amount.toLocaleString('id-ID')
            );

            /*
              Cari order PENDING dengan nominal QRIS
              yang HARUS sama persis.
            */
            cleanupExpiredOrders();

            const order =
                claimPendingOrderByAmount(
                    payment.amount
                );

            if (!order) {

                console.log(
                    '⚠️ Tidak ada order PENDING untuk nominal:',
                    payment.amount
                );

                return res.status(200).json({
                    success: false,
                    matched: false,
                    amount: payment.amount,
                    message:
                        'Tidak ada order PENDING dengan nominal tersebut'
                });
            }

            console.log(
                '✅ PEMBAYARAN COCOK!',
                order.order_id,
                'Rp' +
                payment.amount.toLocaleString('id-ID')
            );

            /*
              Setelah status menjadi PROCESSING,
              transaksi Digiflazz dijalankan.
            */
            const result =
                await processPaidOrder(order);

            return res.status(200).json({
                success: result.success,
                matched: true,
                amount: payment.amount,
                order_id: order.order_id,
                status:
                    result.order?.status ||
                    'PROCESSING',
                digiflazz:
                    result.digiflazz || null,
                message:
                    result.success
                        ? 'Pembayaran diterima dan transaksi Digiflazz diproses'
                        : (
                            result.message ||
                            'Pembayaran diterima tetapi transaksi Digiflazz gagal'
                        )
            });

        } catch (error) {

            console.error(
                '❌ Error webhook MacroDroid:',
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    'Gagal memproses webhook pembayaran'
            });
        }
    }
);


/* ============================================================
   CEK STATUS DIGIFLAZZ
   Endpoint baru agar tidak mengganggu endpoint lama.
   ============================================================ */

app.get(
    '/api/cek-status/:orderId',
    async (req, res) => {

        try {

            const order =
                getOrder(req.params.orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order tidak ditemukan'
                });
            }

            /*
              Kalau sudah final, jangan kirim request
              baru ke Digiflazz.
            */
            if (
                order.status === 'SUCCESS' ||
                order.status === 'FAILED'
            ) {
                return res.json({
                    success: true,
                    source: 'local',
                    order
                });
            }

            const refId =
                String(
                    order.digiflazz_ref_id || ''
                ).trim();

            if (!refId) {
                return res.json({
                    success: true,
                    source: 'local',
                    order,
                    message:
                        'Transaksi Digiflazz belum memiliki ref_id'
                });
            }

            const isPostpaid =
                String(order.type || '')
                    .toUpperCase() === 'POSTPAID';

            const payload = {
                username: DIGIFLAZZ_USERNAME,
                buyer_sku_code:
                    String(order.sku || '').trim(),
                customer_no:
                    String(order.target || '').trim(),
                ref_id: refId,
                sign: getTransactionSign(refId)
            };

            /*
              Postpaid mempunyai command status-pasca.
              Prepaid menurut dokumentasi Digiflazz
              dicek dengan topup ulang memakai ref_id
              yang sama.
            */
            if (isPostpaid) {
                payload.commands = 'status-pasca';
            }

            const response =
                await axios.post(
                    DIGIFLAZZ_TRANSACTION_URL,
                    payload,
                    {
                        timeout: 30000,
                        headers: {
                            'Content-Type':
                                'application/json'
                        }
                    }
                );

            const data =
                response.data?.data || {};

            const status =
                String(data.status || '').trim();

            let localStatus =
                order.status;

            if (
                status.toUpperCase() ===
                'SUKSES'
            ) {
                localStatus = 'SUCCESS';
            } else if (
                status.toUpperCase() ===
                'GAGAL'
            ) {
                localStatus = 'FAILED';
            } else if (
                status.toUpperCase() ===
                'PENDING'
            ) {
                localStatus = 'PROCESSING';
            }

            const updated =
                updateOrder(
                    order.order_id,
                    {
                        status: localStatus,
                        digiflazz_status:
                            status || null,
                        digiflazz_message:
                            data.message || null,
                        sn:
                            data.sn ||
                            order.sn ||
                            null,
                        digiflazz_response:
                            data,
                        processed_at:
                            new Date().toISOString()
                    }
                );

            return res.json({
                success: true,
                source: 'digiflazz',
                order: updated,
                digiflazz: data
            });

        } catch (error) {

            console.error(
                '❌ Gagal cek status Digiflazz:',
                error.response?.data ||
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    error.response?.data?.data?.message ||
                    error.response?.data?.message ||
                    error.message
            });
        }
    }
);


app.listen(PORT, () => {
    console.log(
        `Server Termux jalan di port ${PORT}`
    );
});
