import crypto from 'node:crypto';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const inputData = await request.json();

        const username = env.DIGIFLAZZ_USERNAME;
        // Menggunakan API Key (Production/Development Key) untuk signature transaksi, BUKAN Secret Key webhook
        const apiKey = env.DIGIFLAZZ_API_KEY; 
        
        const buyerSkuCode = inputData.buyer_sku_code;
        const customerNo = inputData.customer_no;
        const refId = inputData.ref_id;

        if (!username || !apiKey) {
            return Response.json({ status: "error", error: "Konfigurasi Username atau API Key Digiflazz belum terbaca di environment." }, { status: 500 });
        }

        // Rumus signature resmi Digiflazz untuk transaksi: username + apiKey + refId
        const signData = username + apiKey + refId;
        const signature = crypto.createHash('md5').update(signData).digest('hex');

        const digiflazzResponse = await fetch('https://api.digiflazz.com/v1/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                buyer_sku_code: buyerSkuCode,
                customer_no: customerNo,
                ref_id: refId,
                sign: signature,
                testing: false
            })
        });

        const result = await digiflazzResponse.json();

        return Response.json({
            status: "success",
            data: result
        }, { status: 200 });

    } catch (err) {
        return Response.json({
            status: "error",
            error: err.message || "Gagal menyambungkan ke server backend."
        }, { status: 500 });
    }
}
