/**
 * Mengambil data dari dataBahanAjar.json menggunakan Fetch API.
 * @returns {Promise<Object>}
 */
export async function fetchBahanAjarData() {
  const filePath = "/data/dataBahanAjar.json";
  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(
        `Gagal memuat data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`[data-service.js] Data berhasil di-fetch dari ${filePath}.`);
    return data;
  } catch (error) {
    console.error(`[data-service.js] Error saat fetch data: ${error.message}`);
    return {
      upbjjList: [],
      kategoriList: [],
      pengirimanList: [],
      paket: [],
      stok: [],
      tracking: {},
    };
  }
}
