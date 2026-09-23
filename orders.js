const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'orders.json');
const ORDER_EXPIRE_MS = 10 * 60 * 1000;

function ensureDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '[]', 'utf8');
    }
}

function readOrders() {
    ensureDB();

    try {
        const data = JSON.parse(
            fs.readFileSync(DB_FILE, 'utf8')
        );

        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(
            '❌ Gagal membaca orders.json:',
            err.message
        );

        return [];
    }
}

function writeOrders(orders) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(orders, null, 2),
        'utf8'
    );
}

function generateOrderId() {
    const now = new Date();

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const i = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `TDP-${y}${m}${d}-${h}${i}${s}${ms}`;
}

function createOrder({
    sku,
    productName,
    target,
    amount,
    whatsapp,
    basePrice,
    margin,
    uniqueCode,

    // Pascabayar
    isPostpaid = false,
    inquiryRefId = null,
    customerName = '',
    inquiryData = null
}) {
    if (!sku || !target || !amount) {
        throw new Error(
            'SKU, target, dan amount wajib diisi'
        );
    }

    const now = Date.now();

    const order = {
        order_id: generateOrderId(),

        sku: String(sku).trim(),
        product_name: String(productName || '').trim(),
        target: String(target).trim(),

        amount: Number(amount),
        base_price: Number(basePrice || amount),
        margin: Number(margin || 0),
        unique_code: Number(uniqueCode || 0),

        whatsapp: String(whatsapp || '').trim(),

        type: isPostpaid ? 'POSTPAID' : 'PREPAID',

        // Data inquiry pascabayar
        inquiry_ref_id: inquiryRefId
            ? String(inquiryRefId)
            : null,

        customer_name: String(
            customerName || ''
        ).trim(),

        inquiry_data: inquiryData || null,

        status: 'PENDING',

        created_at: new Date(now).toISOString(),

        expires_at: new Date(
            now + ORDER_EXPIRE_MS
        ).toISOString(),

        paid_at: null,
        processed_at: null,

        digiflazz_ref_id: null,
        digiflazz_status: null,
        digiflazz_message: null,

        sn: null
    };

    const orders = readOrders();

    orders.push(order);

    writeOrders(orders);

    return order;
}

function cleanupExpiredOrders() {
    const orders = readOrders();
    const now = Date.now();

    let changed = false;

    for (const order of orders) {
        if (
            order.status === 'PENDING' &&
            order.expires_at &&
            new Date(order.expires_at).getTime() <= now
        ) {
            order.status = 'EXPIRED';
            changed = true;
        }
    }

    if (changed) {
        writeOrders(orders);
    }

    return orders;
}

function getPendingOrderByAmount(amount) {
    cleanupExpiredOrders();

    const orders = readOrders();

    return orders.find(order =>
        order.status === 'PENDING' &&
        Number(order.amount) === Number(amount)
    ) || null;
}

function claimPendingOrderByAmount(amount) {
    const orders = readOrders();
    const now = Date.now();

    for (const order of orders) {
        if (
            order.status === 'PENDING' &&
            Number(order.amount) === Number(amount) &&
            order.expires_at &&
            new Date(order.expires_at).getTime() > now
        ) {
            order.status = 'PROCESSING';
            order.paid_at = new Date(now).toISOString();

            writeOrders(orders);

            return order;
        }
    }

    return null;
}

function updateOrder(orderId, updates) {
    const orders = readOrders();

    const index = orders.findIndex(
        order => order.order_id === orderId
    );

    if (index === -1) {
        return null;
    }

    orders[index] = {
        ...orders[index],
        ...updates
    };

    writeOrders(orders);

    return orders[index];
}

function getOrder(orderId) {
    const orders = readOrders();

    return orders.find(
        order => order.order_id === orderId
    ) || null;
}

module.exports = {
    createOrder,
    cleanupExpiredOrders,
    getPendingOrderByAmount,
    claimPendingOrderByAmount,
    updateOrder,
    getOrder
};
