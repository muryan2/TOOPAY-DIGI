let dataLayananTooPay = [];
const NOMOR_WA_ADMIN = "628123456789"; // Silakan ganti dengan nomor WA Toko Anda sendiri

function muatDataProduk() {
    fetch('products.json')
        .then(res => {
            if (!res.ok) throw new Error('File products.json tidak merespon');
            return res.json();
        })
        .then(data => {
            dataLayananTooPay = data;
            console.log("Database produk TooPay Digi berhasil dimuat!");
        })
        .catch(err => {
            console.error('Error memuat data:', err);
        });
}

function saringLayananPrabayar(kategoriDipilih) {
    // products.json Anda menggunakan penulisan huruf besar di awal seperti: "Pulsa", "Data", "Games"
    const hasilFilter = dataLayananTooPay.filter(p => {
        const kat = p.category || "";
        return kat.toLowerCase() === kategoriDipilih.toLowerCase();
    });
    renderDaftarProdukTooPay(hasilFilter);
}

function renderDaftarProdukTooPay(daftarProduk) {
    // Mencari kontainer produk bawaan template asli Anda (.product-list atau kontainer penampung di bawah menu prabayar)
    let container = document.querySelector(".product-list") || document.getElementById("produk-container") || document.querySelector(".brand-list");
    if (!container) return;

    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";

    if (daftarProduk.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#78909c; font-size:0.8rem; padding:20px; width:100%;'>Produk tidak ditemukan atau sedang dinonaktifkan.</p>";
        return;
    }

    daftarProduk.forEach(produk => {
        const nama = produk.product_name || "Produk Tanpa Nama";
        const harga = produk.price || 0;

        const kartuProduk = document.createElement("div");
        kartuProduk.className = "product-card";
        kartuProduk.onclick = () => pilihProdukKeKonfirmasi(nama, harga);

        kartuProduk.innerHTML = `
            <div class="brand-card-info">
                <i class="fa-solid fa-mobile-screen-button"></i>
                <div style="display: flex; flex-direction: column; gap: 2px; text-align:left;">
                    <span style="font-size: 0.85rem; font-weight:700;">${nama}</span>
                    <span style="font-size: 0.72rem; color: #78909c;">Proses Otomatis 24 Jam</span>
                </div>
            </div>
            <span style="color: var(--brand-accent); font-weight: 800; font-size: 0.9rem; white-space:nowrap; margin-left:10px;">Rp ${harga.toLocaleString('id-ID')}</span>
        `;
        container.appendChild(kartuProduk);
    });
    
    container.scrollIntoView({ behavior: 'smooth' });
}

function pilihProdukKeKonfirmasi(namaProduk, hargaProduk) {
    const targetNama = document.getElementById("nama-produk-terpilih") || document.querySelector(".box-konfirmasi p span");
    const targetHarga = document.getElementById("total-tagihan");

    if (targetNama) targetNama.innerText = namaProduk;
    if (targetHarga) targetHarga.innerText = "Rp " + hargaProduk.toLocaleString('id-ID');

    const sectionKonfirmasi = document.getElementById("section-konfirmasi") || document.querySelector(".box-konfirmasi");
    if (sectionKonfirmasi) {
        sectionKonfirmasi.scrollIntoView({ behavior: 'smooth' });
    }
}

function prosesNotaWhatsApp() {
    const targetNamaElement = document.getElementById("nama-produk-terpilih");
    const totalTagihanElement = document.getElementById("total-tagihan");
    
    const produk = targetNamaElement ? targetNamaElement.innerText : "-";
    const total = totalTagihanElement ? totalTagihanElement.innerText : "-";
    const pelanggan = document.getElementById("input-pelanggan") ? document.getElementById("input-pelanggan").value : "";
    const waUser = document.getElementById("input-wa") ? document.getElementById("input-wa").value : "";

    if (produk === "-" || !pelanggan || !waUser) {
        alert("⚠️ Mohon pilih paket produk dan isi nomor tujuan transaksi Anda dengan lengkap!");
        return;
    }

    const teksWhatsApp = `Halo TooPay Digi, saya ingin order paket berikut:%0A` +
                        `----------------------------------------%0A` +
                        `📋 *Produk:* ${produk}%0A` +
                        `🆔 *No.Tujuan / ID:* ${pelanggan}%0A` +
                        `💰 *Total Tagihan:* ${total}%0A` +
                        `📱 *WhatsApp Pembeli:* ${waUser}%0A` +
                        `----------------------------------------%0A` +
                        `Mohon segera diproses, terima kasih!`;

    window.open(`https://whatsapp.com{NOMOR_WA_ADMIN}&text=${teksWhatsApp}`, '_blank');
}

// Menghubungkan tombol menu grid prabayar bawaan HTML asli Anda ke sistem penyaringan JavaScript
document.addEventListener("DOMContentLoaded", function() {
    const btnLanjutHTML = document.querySelector(".btn-lanjut") || document.querySelector("button[onclick*='Pembayaran']");
    if (btnLanjutHTML) {
        btnLanjutHTML.setAttribute("onclick", "prosesNotaWhatsApp()");
    }

    const kotakMenu = document.querySelectorAll(".service-box");
    kotakMenu.forEach(box => {
        // Matikan fungsi link href asli bawaan HTML agar tidak memicu refresh halaman otomatis saat diklik
        box.addEventListener("click", function(event) {
            event.preventDefault();
        });

        const textMenu = box.innerText.trim().toLowerCase();
        
        if (textMenu.includes("pulsa")) box.setAttribute("onclick", "saringLayananPrabayar('Pulsa')");
        else if (textMenu.includes("paket data") || textMenu.includes("data")) box.setAttribute("onclick", "saringLayananPrabayar('Data')");
        else if (textMenu.includes("game")) box.setAttribute("onclick", "saringLayananPrabayar('Games')");
        else if (textMenu.includes("voucher")) box.setAttribute("onclick", "saringLayananPrabayar('Aktivasi Voucher')");
        else if (textMenu.includes("e-money") || textMenu.includes("money")) box.setAttribute("onclick", "saringLayananPrabayar('E-Money')");
        else if (textMenu.includes("tv")) box.setAttribute("onclick", "saringLayananPrabayar('TV')");
        else if (textMenu.includes("aktif")) box.setAttribute("onclick", "saringLayananPrabayar('Masa Aktif')");
        else if (textMenu.includes("perdana")) box.setAttribute("onclick", "saringLayananPrabayar('Aktivasi Perdana')");
    });
});

window.onload = muatDataProduk;
