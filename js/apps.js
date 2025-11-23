// ---Data JSON (menggantikan dataBahanAjar.json) ---
import { fetchBahanAjarData } from "/js/fetchData.js";

// ---Fungsi Utilitas ---

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

function formatRupiah(value) {
  if (typeof value !== "number") return "Rp 0";
  return formatter.format(value);
}

function formatTanggalWaktu(dateStr, showTime = false) {
  if (!dateStr) return "";
  const options = { year: "numeric", month: "long", day: "numeric" };
  if (showTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.second = "2-digit";
  }
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", options);
  } catch (e) {
    return dateStr;
  }
}

function ekspedisiName(kode, pengirimanList) {
  const exp = (pengirimanList || []).find((e) => e.kode === kode);
  return exp ? exp.nama : kode;
}

// ---Komponen Stok Bahan Ajar ---

// Komponen Dashboard
Vue.component("halaman-dashboard", {
  template: "#home",
  methods: {
    gantiKeStok() {
      this.$emit("ganti-tab", "tampilkan-stok");
    },
    gantiKeTracking() {
      this.$emit("ganti-tab", "tampilkan-tracking");
    },
  },
});

// Komponen Filter (stok-filter)
Vue.component("stok-filter", {
  template: "#stok-filter",
  data() {
    return {
      upbjjTerpilih: this.$root.filterAktif.upbjj || "",
      kategoriTerpilih: this.$root.filterAktif.kategori || "",
      urutBerdasarkan: this.$root.filterAktif.sort || "",
      filterReorder: this.$root.filterAktif.reorder || false,
    };
  },
  watch: {
    upbjjTerpilih(val) {
      this.$root.filterAktif.upbjj = val;
      if (!val) this.kategoriTerpilih = "";
    },
    kategoriTerpilih(val) {
      this.$root.filterAktif.kategori = val;
    },
    urutBerdasarkan(val) {
      this.$root.filterAktif.sort = val;
    },
    filterReorder(val) {
      this.$root.filterAktif.reorder = val;
    },
  },
  methods: {
    reset() {
      this.upbjjTerpilih = "";
      this.kategoriTerpilih = "";
      this.urutBerdasarkan = "";
      this.filterReorder = false;
    },
  },
});

// Komponen Tabel
Vue.component("stok-tabel", {
  template: "#stok-tabel",
  data() {
    return {
      tooltipData: {
        visible: false,
        content: "",
      },
    };
  },
  computed: {
    stokTersaring() {
      let filtered = this.$root.dataApp.stok || [];
      const filter = this.$root.filterAktif;

      if (filter.upbjj) {
        filtered = filtered.filter((s) => s.upbjj === filter.upbjj);
      }
      if (filter.upbjj && filter.kategori) {
        filtered = filtered.filter((s) => s.kategori === filter.kategori);
      }
      if (filter.reorder) {
        filtered = filtered.filter((s) => s.qty < s.safety || s.qty === 0);
      }

      if (filter.sort) {
        const sortKey = filter.sort;
        filtered.sort((a, b) => {
          if (a[sortKey] < b[sortKey]) return -1;
          if (a[sortKey] > b[sortKey]) return 1;
          return 0;
        });
      }
      return filtered;
    },
  },
  methods: {
    formatRupiah: formatRupiah,
    statusClass(s) {
      if (s.qty === 0) return "status-kosong";
      if (s.qty < s.safety) return "status-menipis";
      return "status-aman";
    },
    statusText(s) {
      if (s.qty === 0) return "🔴 Kosong";
      if (s.qty < s.safety) return "⚠️ Menipis";
      return "✅ Aman";
    },
    // Method baru untuk menampilkan tooltip
    showTooltip(stok, event) {
      if (!stok.catatanHTML) return;

      this.tooltipData.content = stok.catatanHTML;
      this.tooltipData.visible = true;
    },
    // Method baru untuk menyembunyikan tooltip
    hideTooltip() {
      this.tooltipData.visible = false;
      this.tooltipData.content = "";
    },
    hapusStok(stok) {
      if (confirm(`Yakin ingin menghapus stok ${stok.kode} - ${stok.judul}?`)) {
        const index = this.$root.dataApp.stok.findIndex(
          (s) => s.kode === stok.kode
        );
        if (index !== -1) {
          this.$root.dataApp.stok.splice(index, 1);
          alert("Stok bahan ajar berhasil dihapus.");
        }
      }
    },
  },
});

// Komponen Modal Update Stok (stok-modal)
Vue.component("stok-modal", {
  template: "#stok-modal",
  data() {
    return {
      modalTerbuka: false,
      stokDipilih: {},
      modeUbah: "tambah",
      jumlahUbah: 1,
      jumlahError: null,
    };
  },
  watch: {
    jumlahUbah(val) {
      this.jumlahError = null;
      if (val <= 0) {
        this.jumlahError = "Jumlah harus lebih dari 0.";
      } else if (this.modeUbah === "kurang" && val > this.stokDipilih.qty) {
        this.jumlahError = `Stok yang dikurangi (${val}) melebihi stok yang ada (${this.stokDipilih.qty}).`;
      }
    },
  },
  created() {
    this.$root.$on("buka-modal", this.bukaModal);
  },
  methods: {
    bukaModal(stok, mode) {
      this.stokDipilih = stok;
      this.modeUbah = mode;
      this.jumlahUbah = 1;
      this.jumlahError = null;
      this.modalTerbuka = true;
    },
    tutupModal() {
      this.modalTerbuka = false;
      this.stokDipilih = {};
    },
    konfirmasiUbah() {
      if (this.jumlahError) return;

      const index = this.$root.dataApp.stok.findIndex(
        (s) => s.kode === this.stokDipilih.kode
      );
      if (index !== -1) {
        if (this.modeUbah === "tambah") {
          this.$root.dataApp.stok[index].qty += this.jumlahUbah;
        } else if (this.modeUbah === "kurang") {
          this.$root.dataApp.stok[index].qty -= this.jumlahUbah;
          if (this.$root.dataApp.stok[index].qty < 0) {
            this.$root.dataApp.stok[index].qty = 0;
          }
        }
        alert("Stok berhasil diperbaharui.");
      }
      this.tutupModal();
    },
  },
});

// Komponen Form Tambah Stok
Vue.component("stok-tambah-form", {
  template: "#stok-tambah-form",
  data() {
    return {
      formTerbuka: false,
      stokBaru: this.resetForm(),
    };
  },
  created() {
    this.$root.$on("buka-form-tambah-stok", () => {
      this.stokBaru = this.resetForm();
      this.formTerbuka = true;
    });
  },
  methods: {
    resetForm() {
      const upbjjList =
        (this.$root.dataApp && this.$root.dataApp.upbjjList) || [];
      const kategoriList =
        (this.$root.dataApp && this.$root.dataApp.kategoriList) || [];

      return {
        kode: "",
        judul: "",
        kategori: kategoriList[0] || "",
        upbjj: upbjjList[0] || "",
        lokasiRak: "",
        harga: 0,
        qty: 0,
        safety: 0,
        catatanHTML: "",
      };
    },
    tutupForm() {
      this.formTerbuka = false;
    },
    tambahStok() {
      if (
        !this.stokBaru.kode ||
        !this.stokBaru.judul ||
        !this.stokBaru.upbjj ||
        !this.stokBaru.kategori
      ) {
        alert("Kode, Judul, UT-Daerah, dan Kategori wajib diisi.");
        return;
      }

      const isExist = (this.$root.dataApp.stok || []).some(
        (s) => s.kode === this.stokBaru.kode
      );
      if (isExist) {
        alert(`Kode ${this.stokBaru.kode} sudah ada. Mohon gunakan kode lain.`);
        return;
      }

      this.stokBaru.qty = Number(this.stokBaru.qty) || 0;
      this.stokBaru.safety = Number(this.stokBaru.safety) || 0;
      this.stokBaru.harga = Number(this.stokBaru.harga) || 0;

      this.$root.dataApp.stok.push({ ...this.stokBaru });
      alert("Stok bahan ajar baru berhasil ditambahkan!");
      this.tutupForm();
    },
  },
});

// ---Komponen Tracking Delivery Order (DO) ---

// Komponen 1: tracking-opsi
Vue.component("tracking-opsi", {
  template: "#tracking-opsi",
  computed: {
    showSearch() {
      return this.$root.trackingState.showSearch;
    },
    showFormDO() {
      return this.$root.trackingState.showFormDO;
    },
  },
  methods: {
    toggleSearch() {
      this.$root.trackingState.showSearch =
        !this.$root.trackingState.showSearch;
      this.$root.trackingState.showFormDO = false;
    },
    toggleFormDO() {
      this.$root.trackingState.showFormDO =
        !this.$root.trackingState.showFormDO;
      this.$root.trackingState.showSearch = false;
    },
  },
});

// Komponen 2: tracking-cari (Pencarian dan Hasil)
Vue.component("tracking-cari", {
  template: "#tracking-cari",
  data() {
    return {
      keyword: this.$root.trackingState.keyword,
      keteranganBaru: {},
    };
  },
  computed: {
    showSearch() {
      return this.$root.trackingState.showSearch;
    },
    filteredDO() {
      return this.$root.trackingState.filteredDO;
    },
    showNotFound() {
      return this.$root.trackingState.showNotFound;
    },
    trackingDataFlat() {
      return this.$root.dataApp.tracking || {};
    },
    showResults() {
      return Object.keys(this.filteredDO).length > 0 && this.showSearch;
    },
  },
  created() {
    this.$root.$on("cari-do-after-add", this.cariDO);
    this.$root.$on("reset-tracking-esc", this.resetCari);
  },
  watch: {
    keyword(val) {
      this.$root.trackingState.keyword = val;
    },
  },
  methods: {
    formatRupiah: formatRupiah,
    formatTanggal(dateStr) {
      return formatTanggalWaktu(dateStr, false);
    },
    formatWaktu(dateStr) {
      return formatTanggalWaktu(dateStr, true);
    },
    ekspedisiName(kode) {
      return ekspedisiName(kode, this.$root.dataApp.pengirimanList);
    },
    muatSemuaDO() {},
    resetCari() {
      this.keyword = "";
      // Reset filteredDO dan showNotFound
      this.$root.trackingState.filteredDO = {};
      this.$root.trackingState.showNotFound = false;
    },
    beforeDestroy() {
      this.$root.$off("reset-tracking-esc", this.resetCari);
    },
    cariDO() {
      this.$root.trackingState.filteredDO = {};
      this.$root.trackingState.showNotFound = false;
      const keywordLower = this.keyword.toLowerCase().trim();

      if (!keywordLower) {
        this.$root.trackingState.filteredDO = {};
        alert("Masukkan Kode DO atau NIM untuk melakukan pencarian.");
        return;
      }

      const results = {};
      let found = false;

      for (const kodeDO in this.trackingDataFlat) {
        const item = this.trackingDataFlat[kodeDO];
        if (
          kodeDO.toLowerCase().includes(keywordLower) ||
          item.nim.toLowerCase().includes(keywordLower)
        ) {
          results[kodeDO] = item;
          found = true;
        }
      }

      this.$root.trackingState.filteredDO = results;
      if (!found) {
        this.$root.trackingState.showNotFound = true;
      }
    },
    resetCari() {
      this.keyword = "";
      // Reset filteredDO dan showNotFound
      this.$root.trackingState.filteredDO = {};
      this.$root.trackingState.showNotFound = false;
    },
    closeModal() {
      this.$root.trackingState.showNotFound = false;
    },
    tambahProgress(kodeDO) {
      const keterangan = this.keteranganBaru[kodeDO];
      if (!keterangan) {
        alert("Keterangan perjalanan wajib diisi.");
        return;
      }

      const doItem = this.trackingDataFlat[kodeDO];

      if (doItem) {
        doItem.perjalanan.push({
          waktu: new Date().toISOString(),
          keterangan: keterangan,
        });

        doItem.status = keterangan.toLowerCase().includes("diterima")
          ? "Selesai"
          : "Dalam Perjalanan";

        this.$set(this.trackingDataFlat, kodeDO, doItem);
        this.$set(this.keteranganBaru, kodeDO, "");

        this.cariDO();
        alert("Progress pengiriman berhasil ditambahkan!");
      }
    },
  },
});

// Komponen 3: tracking-tambah (Form Tambah DO)
Vue.component("tracking-tambah", {
  template: "#tracking-tambah",
  data() {
    return {
      nimBaru: this.$root.trackingState.nimBaru,
      namaBaru: this.$root.trackingState.namaBaru,
      ekspedisiBaru: this.$root.trackingState.ekspedisiBaru,
      paketKodeBaru: this.$root.trackingState.paketKodeBaru,
      tanggalKirimBaru: this.$root.trackingState.tanggalKirimBaru,
    };
  },
  computed: {
    showFormDO() {
      return this.$root.trackingState.showFormDO;
    },
    nextDONumber() {
      const trackingDataFlat = this.$root.dataApp.tracking || {};
      const currentYear = new Date().getFullYear();
      const doKeys = Object.keys(trackingDataFlat).filter((key) =>
        key.startsWith(`DO${currentYear}-`)
      );

      let maxSequence = 0;
      if (doKeys.length > 0) {
        doKeys.forEach((key) => {
          const seq = parseInt(key.split("-")[1]);
          if (!isNaN(seq) && seq > maxSequence) {
            maxSequence = seq;
          }
        });
      }

      const nextSeq = maxSequence + 1;
      const seqPadded = nextSeq.toString().padStart(4, "0");
      return `DO${currentYear}-${seqPadded}`;
    },
    paketDipilih() {
      return (this.$root.dataApp.paket || []).find(
        (p) => p.kode === this.paketKodeBaru
      );
    },
  },
  watch: {
    nimBaru(val) {
      this.$root.trackingState.nimBaru = val;
    },
    namaBaru(val) {
      this.$root.trackingState.namaBaru = val;
    },
    ekspedisiBaru(val) {
      this.$root.trackingState.ekspedisiBaru = val;
    },
    paketKodeBaru(val) {
      this.$root.trackingState.paketKodeBaru = val;
    },
    tanggalKirimBaru(val) {
      this.$root.trackingState.tanggalKirimBaru = val;
    },
  },
  methods: {
    formatRupiah: formatRupiah,
    resetFormDO() {
      this.nimBaru = "";
      this.namaBaru = "";
      this.ekspedisiBaru = "";
      this.paketKodeBaru = "";
      this.tanggalKirimBaru = new Date().toISOString().slice(0, 10);
    },
    tambahDO() {
      if (
        !this.nimBaru ||
        !this.namaBaru ||
        !this.ekspedisiBaru ||
        !this.paketKodeBaru ||
        !this.tanggalKirimBaru
      ) {
        alert("Semua field wajib diisi.");
        return;
      }
      if (!this.paketDipilih) {
        alert("Paket tidak valid.");
        return;
      }

      const newDO = {
        nim: this.nimBaru,
        nama: this.namaBaru,
        status: "Proses Input",
        ekspedisi: this.ekspedisiBaru,
        tanggalKirim: this.tanggalKirimBaru,
        paket: this.paketKodeBaru,
        total: this.paketDipilih.harga,
        perjalanan: [
          {
            waktu: new Date().toISOString(),
            keterangan: "Data DO telah dibuat.",
          },
        ],
      };

      // Tambahkan DO ke Root Data secara reaktif
      this.$set(this.$root.dataApp.tracking, this.nextDONumber, newDO);

      alert(`Delivery Order berhasil ditambahkan!`);

      this.resetFormDO();
      this.$root.trackingState.showFormDO = false;
      this.$root.trackingState.showSearch = true;
      this.$root.trackingState.keyword = this.nextDONumber;

      // Panggil event global untuk memicu pencarian di tracking-cari
      this.$root.$emit("cari-do-after-add");
    },
  },
  created() {
    this.tanggalKirimBaru = new Date().toISOString().slice(0, 10);
  },
});

// ---Root Vue Instance ---

new Vue({
  el: "#app",
  data() {
    return {
      tab: "tampilkan-home",
      dataApp: {},
      filterAktif: {
        // State untuk filter Stok
        upbjj: "",
        kategori: "",
        sort: "",
        reorder: false,
      },
      trackingState: {
        // State untuk semua komponen Tracking
        showSearch: true,
        showFormDO: false,
        keyword: "",
        filteredDO: {},
        showNotFound: false,
        nimBaru: "",
        namaBaru: "",
        ekspedisiBaru: "",
        paketKodeBaru: "",
        tanggalKirimBaru: new Date().toISOString().slice(0, 10),
      },
    };
  },
  methods: {
    gantiTab(namaTab) {
      this.tab = namaTab;
    },
    async muatData() {
      // Panggil fungsi fetch asinkron
      this.dataApp = await fetchBahanAjarData();
    },
    handleKeydown(event) {
      if (event.keyCode === 27) {
        if (this.tab === "tampilkan-tracking") {
          this.$emit("reset-tracking-esc");
        }
      }
    },
  },
  created() {
    this.muatData();
  },
  mounted() {
    // Daftarkan listener saat komponen utama dimuat
    window.addEventListener("keydown", this.handleKeydown);
  },
  beforeDestroy() {
    // Hapus listener saat komponen dihancurkan (best practice)
    window.removeEventListener("keydown", this.handleKeydown);
  },
});
