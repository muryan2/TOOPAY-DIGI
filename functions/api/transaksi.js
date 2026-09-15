async function bayarProdukPrabayar() {
  const dataPesanan = {
    buyer_sku_code: "s5", // Contoh: Telkomsel 5rb
    customer_no: "081234567890", // Nomor HP tujuan
    ref_id: "TOOPAY-" + Date.now() // Kode unik transaksi anti-ganda
  };

  try {
    const response = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPesanan)
    });

    const hasil = await response.json();
    console.log("Respons Transaksi:", hasil);
    
    if (hasil.success) {
      alert("Transaksi berhasil diproses!");
    } else {
      alert("Gagal: " + (hasil.data?.data?.message || hasil.message));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
