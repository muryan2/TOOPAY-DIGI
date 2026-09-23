const RAW_QRIS_STATIC =
    "00020101021126570011ID.DANA.WWW011893600915303419253102090341925310303UMI51440014ID.CO.QRIS.WWW0215ID10265728824250303UMI5204481453033605802ID5911TooPay PPOB6011Kab. Batang6105512536304EDC0";

function crc16(str) {
    let crc = 0xFFFF;

    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }

            crc &= 0xFFFF;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generateDynamicQRIS(amount) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Nominal QRIS tidak valid');
    }

    if (!Number.isInteger(numericAmount)) {
        throw new Error('Nominal QRIS harus berupa angka bulat');
    }

    let baseQris = RAW_QRIS_STATIC.slice(0, -4);

    const amountStr = String(numericAmount);
    const amountTag =
        '54' +
        String(amountStr.length).padStart(2, '0') +
        amountStr;

    let step1;

    if (baseQris.includes('5802ID')) {
        step1 = baseQris.replace(
            '5802ID',
            amountTag + '5802ID'
        );
    } else {
        step1 = baseQris + amountTag;
    }

    return step1 + crc16(step1);
}

module.exports = {
    RAW_QRIS_STATIC,
    crc16,
    generateDynamicQRIS
};
