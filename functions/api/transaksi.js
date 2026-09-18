export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { action, payload } = body;

        // URL Webhook dari MacroDroid di HP Android Anda (misalnya menggunakan ngrok atau IP lokal)
        const MACRODROID_WEBHOOK_URL = "https://your-macrodroid-webhook-url.com/endpoint";

        // Meneruskan data aksi (baik itu ambil produk, inquiry, atau transaksi) ke MacroDroid HP
        const macroResponse = await fetch(MACRODROID_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action, // contoh: "get_pricelist", "transaction", "pascabayar_inquiry", "pascabayar_pay"
                payload: payload
            })
        });

        const macroResult = await macroResponse.json();

        return new Response(JSON.stringify({
            status: "success",
            message: "Permintaan berhasil diproses via MacroDroid",
            data: macroResult
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({
            status: "error",
            message: error.message
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
