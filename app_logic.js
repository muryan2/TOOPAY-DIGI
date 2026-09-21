// ====== LOGIKA INTEGRASI PRODUK DIGIFLAZZ REAL-TIME ======

function tampilkanProdukLayanan(namaBrand, namaKategori) {
    const container = document.querySelector(".product-list") || document.querySelector(".brand-list") || document.getElementById("appContainer");
    if (!container) return;

    if (!globalProductsJson || globalProductsJson.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; font-size:14px; color:#78909c;'>Data produk sedang dimuat, harap tunggu sebentar...</p>";
        return;
    }

    const hasilSaring = globalProductsJson.filter(p => {
        const brandCocok = (p.brand || "").toLowerCase() === namaBrand.toLowerCase();
        const katJson = (p.category || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        const katMenu = namaKategori.toLowerCase().replace(/[^a-z0-9]/g, '');
        return brandCocok && (katJson.includes(katMenu) || katMenu.includes(katJson));
    });

    hasilSaring.sort((a, b) => a.price - b.price);
    container.innerHTML = "";

    if (hasilSaring.length === 0) {
        container.innerHTML = `<p style='text-align:center; padding:20px; font-size:14px; color:#78909c;'>Produk ${namaBrand} untuk kategori ini tidak tersedia.</p>`;
        return;
    }

    hasilSaring.forEach(produk => {
        const nama = produk.product_name || "Produk Tanpa Nama";
        const harga = produk.price || 0;

        const kartu = document.createElement("div");
        kartu.className = "product-card";
        kartu.onclick = function() {
            const targetNama = document.getElementById("nama-produk-terpilih") || document.querySelector(".box-konfirmasi p span");
            const targetHarga = document.getElementById("total-tagihan");
            
            if (targetNama) targetNama.innerText = nama;
            if (targetHarga) targetHarga.innerText = "Rp " + harga.toLocaleString('id-ID');
            
            const formBawah = document.getElementById("section-konfirmasi") || document.querySelector(".box-konfirmasi");
            if (formBawah) formBawah.scrollIntoView({ behavior: 'smooth' });
        };

        kartu.innerHTML = `
            <div class="brand-card-info">
                <i class="fa-solid fa-mobile-screen-button"></i>
                <div style="display:flex; flex-direction:column; text-align:left; margin-left:10px;">
                    <span style="font-size:14px; font-weight:bold;">${nama}</span>
                    <span style="font-size:11px; color:#78909c;">Proses Instan 24 Jam</span>
                </div>
            </div>
            <span style="color:var(--brand-accent); font-weight:800; font-size:14px; white-space:nowrap;">Rp ${harga.toLocaleString('id-ID')}</span>
        `;
        container.appendChild(kartu);
    });
}

function inisialisasiPenyambungOtomatis() {
    setInterval(() => {
        const kartuBrand = document.querySelectorAll(".brand-card");
        kartuBrand.forEach(card => {
            if (!card.hasAttribute("data-hooked")) {
                card.setAttribute("data-hooked", "true");
                
                const namaBrand = card.querySelector("span") ? card.querySelector("span").innerText.trim() : card.innerText.trim();
                const subHeader = document.querySelector(".sub-header span") || document.querySelector(".sub-header");
                const kategoriAktif = subHeader ? subHeader.innerText.trim() : "Pulsa";

                card.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    tampilkanProdukLayanan(namaBrand, kategoriAktif);
                };
            }
        });
    }, 400);
}

document.addEventListener("DOMContentLoaded", function() {
    inisialisasiPenyambungOtomatis();
});
