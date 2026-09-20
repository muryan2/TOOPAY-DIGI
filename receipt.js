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
    const hasilFilter = dataLayananTooPay.filter(p => {
        const kat = p.category || "";
        return kat.toLowerCase() === kategoriDipilih.toLowerCase();
    });
    renderDaftarProdukTooPay(hasilFilter);
}

function renderDaftarProdukTooPay(daftarProduk) {
    let container = document.querySelector(".product-list") || document.getElementById("produk-container") || document.getElementById("auto-product-container");
    
    if (!container) {
        container = document.createElement("div");
        container.id = "auto-product-container";
        container.style = "display: flex; flex-direction: column; gap: 10px; margin: 20px 0; padding: 0 4px; width: 100%; box-sizing: border-box;";
        
        const konfirmasiBox = document.getElementById("section-konfirmasi") || document.querySelector(".box-konfirmasi");
        if (konfirmasiBox) {
            konfirmasiBox.parentNode.insertBefore(container, konfirmasiBox);
        } else {
            document.body.appendChild(container);
        }
    }

    container.innerHTML = "";

    if (daftarProduk.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#78909c; font-size:0.85rem; padding:20px; width:100%; background:#ffffff; border-radius:12px; border:1px solid #c8e6c9;'>Produk kategori ini belum tersedia atau sedang dinonaktifkan.</p>";
        return;
    }

    const judulPaket = document.createElement("div");
    judulPaket.style = "font-size: 0.85rem; font-weight: 800; color: #1b5e20; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;";
    judulPaket.innerHTML = `<i class="fa-solid fa-basket-shopping"></i> Kumpulan Paket Pilihan:`;
    container.appendChild(judulPaket);

    daftarProduk.forEach(produk => {
        const nama = produk.product_name || "Produk Tanpa Nama";
        const harga = produk.price || 0;

        const kartuProduk = document.createElement("div");
        kartuProduk.className = "product-card";
        kartuProduk.style = "background: #ffffff; border: 1px solid #c8e6c9; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.02); width: 100%; box-sizing: border-box;";
        kartuProduk.onclick = function(e) {
            e.preventDefault();
            pilihProdukKeKonfirmasi(nama, harga);
        };

        kartuProduk.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; font-weight: 700; color: #263238; font-size: 0.9rem;">
                <i class="fa-solid fa-mobile-screen-button" style="font-size: 1.4rem; color: #2e7d32;"></i>
                <div style="display: flex; flex-direction: column; gap: 2px; text-align:left;">
                    <span style="font-size: 0.85rem; font-weight:700; color:#263238;">${nama}</span>
                    <span style="font-size: 0.72rem; color: #78909c; font-weight:normal;">Proses Otomatis 24 Jam</span>
                </div>
            </div>
            <span style="color: #2e7d32; font-weight: 800; font-size: 0.95rem; white-space:nowrap; margin-left:10px;">Rp ${harga.toLocaleString('id-ID')}</span>
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

// Inisialisasi Event Listener dengan mematikan fungsi tautan bawaan HTML secara paksa
document.addEventListener("DOMContentLoaded", function() {
    const btnLanjutHTML = document.querySelector(".btn-lanjut") || document.querySelector("button[onclick*='Pembayaran']");
    if (btnLanjutHTML) {
        btnLanjutHTML.setAttribute("onclick", "prosesNotaWhatsApp()");
    }

    const kotakMenu = document.querySelectorAll(".service-box") || document.querySelectorAll("a");
    kotakMenu.forEach(box => {
        const textMenu = box.innerText.trim().toLowerCase();
        
        // Cek jika elemen ini merupakan tombol menu layanan prabayar
        let kategori = "";
        if (textMenu.includes("pulsa")) kategori = "Pulsa";
        else if (textMenu.includes("paket data") || textMenu.includes("data")) kategori = "Data";
        else if (textMenu.includes("game")) kategori = "Games";
        else if (textMenu.includes("voucher") && !textMenu.includes("aktivasi")) kategori = "Voucher";
        else if (textMenu.includes("e-money") || textMenu.includes("money")) kategori = "E-Money";
        else if (textMenu.includes("pln")) kategori = "PLN";
        else if (textMenu.includes("sms") || textMenu.includes("telp")) kategori = "Paket SMS & Telpon";
        else if (textMenu.includes("aktivasi voucher")) kategori = "Aktivasi Voucher";
        else if (textMenu.includes("tv")) kategori = "TV";
        else if (textMenu.includes("aktif")) kategori = "Masa Aktif";
        else if (textMenu.includes("perdana")) kategori = "Aktivasi Perdana";

        if (kategori !== "") {
            // Matikan href secara mutlak di level HTML
            box.setAttribute("href", "javascript:void(0);");
            box.removeAttribute("target");
            
            // Suntikkan fungsi saring produk
            box.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                saringLayananPrabayar(kategori);
                return false;
            };
        }
    });
});

muatDataProduk();
