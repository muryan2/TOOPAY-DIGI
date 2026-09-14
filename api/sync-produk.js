<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Aplikasi PPOB AI</title>
</head>
<body>
    <h1>Daftar Produk PPOB</h1>
    
    <!-- Elemen untuk menampilkan loading atau daftar produk -->
    <div id="loading">Memuat produk dari Digiflazz...</div>
    <ul id="daftar-produk"></ul>

    <script>
        // Fungsi untuk mengambil data dari file api/sync-produk.js di Vercel
        async function muatProduk() {
            try {
                // Memanggil backend Vercel Anda sendiri (relatif dari domain)
                const response = await fetch('/api/sync-produk', { method: 'POST' });
                const hasil = await response.json();
                
                // Sembunyikan text loading
                document.getElementById('loading').style.display = 'none';
                
                const ul = document.getElementById('daftar-produk');
                
                // Ambil 10 produk pertama sebagai contoh tampilan di HTML
                const daftarProduk = hasil.data.slice(0, 10); 
                
                daftarProduk.forEach(produk => {
                    const li = document.createElement('li');
                    // Tampilkan nama produk dan harganya
                    li.textContent = `${produk.product_name} - Kode: ${produk.buyer_sku_code} (Harga Modal: Rp${produk.price})`;
                    ul.appendChild(li);
                });

            } catch (error) {
                document.getElementById('loading').textContent = 'Gagal memuat produk: ' + error.message;
            }
        }

        // Jalankan fungsi otomatis saat halaman web dibuka
        muatProduk();
    </script>
</body>
</html>
