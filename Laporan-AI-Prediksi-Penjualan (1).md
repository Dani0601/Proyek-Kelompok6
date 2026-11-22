# Laporan Praktikum — Fitur AI Perkiraan Penjualan (TFLite On-Device)

**Mata kuliah:** Pemrograman Mobile I · **Pertemuan:** [isi nomor pertemuan]
**Kelompok:** 6 · **Proyek:** Sticky Milk (aplikasi UMKM, Expo SDK 58 + Expo Router + Supabase)
**Repositori:** https://github.com/Dani0601/Proyek-Kelompok6 (folder `kelompok6/`)
**Modul acuan:** Modul Praktikum – Fitur AI Forecasting Permintaan dengan TFLite (NasbakPintar) dan Slide Pertemuan 11 – AI On-Device

| Anggota | Peran |
|---|---|
| Dani | Data sintetis, pelatihan model, ekspor TFLite, metrik |
| Dimas | Development build, runtime TFLite, preprocessing, inference model |
| Alfiah | Deret porsi per varian, fallback, tangga keputusan, omzet, evaluasi perkiraan vs kenyataan |
| Istafty | Tampilan untuk owner (Dashboard dan Laporan), pengujian di perangkat, field check |

> **Status:** DRAFT. Tanggal, tautan video, dan tangkapan layar ditandai `[isi ...]` dan diisi setelah bagiannya dikerjakan.
>
> **Jenis data: SINTETIS (diizinkan dosen untuk tahap pengembangan).** Mitra (Sticky Milk) belum memiliki pembukuan penjualan, sehingga model dilatih dari `data_simulasi_produk.csv` (180 hari, 11 varian produk) yang dibuat berdasarkan menu dan harga asli serta estimasi penjualan hasil wawancara pemilik (bagian 3.5). Hasil metrik **hanya membuktikan bahwa alur AI berjalan** (latih → ekspor → jalan di HP → fallback), **bukan** bahwa model akurat untuk Sticky Milk. Setelah transaksi nyata terkumpul, model dilatih ulang (bagian 3.5, butir 4).

---

## 1. Tujuan

1. Menambahkan fitur AI **on-device** ke Sticky Milk: **perkiraan permintaan per produk dan omzet harian** untuk owner, dijalankan oleh model TFLite langsung di HP tanpa server.
2. Menampilkannya di **Dashboard Owner** dan **Laporan** dengan bahasa yang mudah dipahami owner (rupiah, kisaran, kata sehari-hari), tanpa istilah teknis di layar utama.
3. Menguji model terhadap baseline rata-rata 7 hari (MA7) dan melaporkan hasilnya apa adanya (bagian 6.1).
4. Menjaga kejujuran: label sumber selalu sesuai yang dipakai, dan jika model tidak bisa jalan, aplikasi **jatuh ke perkiraan sederhana, bukan crash**.

## 2. Fitur dari Sudut Pandang Owner

Owner tidak melihat kata TFLite, MAE, atau MA7. Istilah teknis hanya ada di lembar **[Cara hitung]** dan di laporan ini.

### 2.1 Dashboard Owner (3 kartu)

```
┌─ Perkiraan Penjualan Besok ──────────────┐
│  Rp 850.000                              │
│  Kisaran Rp 750.000 – Rp 950.000         │
│  ▲ 12% lebih ramai dari biasanya         │
│  ● Dihitung AI di HP ini    [Cara hitung]│
└──────────────────────────────────────────┘
┌─ 7 Hari ke Depan ────────────────────────┐
│  grafik batang Sen..Min · Paling ramai:  │
└──────────────────────────────────────────┘
┌─ Siapkan Besok ──────────────────────────┐
│  3 produk terlaris + perkiraan porsi     │
└──────────────────────────────────────────┘
```

| Kartu | Pertanyaan yang dijawab | Sumber angka |
|---|---|---|
| Perkiraan Penjualan Besok | Besok kira-kira dapat berapa? | Jumlah dari (perkiraan porsi tiap produk × harga). Porsi dari model TFLite, atau rata-rata 7 hari bila model tidak tersedia |
| 7 Hari ke Depan | Kapan paling ramai? | Perkiraan berantai (kasar) + ringkasan hari paling ramai (aturan biasa) |
| Siapkan Besok | Apa yang perlu disiapkan? | Perkiraan porsi 3 produk terlaris (varian S dan L digabung), dengan sumber yang sama seperti kartu pertama |

### 2.2 Laporan Keuangan

Bagian **Perkiraan vs Kenyataan**: satu baris per hari dengan perkiraan omzet, kenyataan, selisih, dan keterangan (Sesuai / Lebih ramai / Lebih sepi), ditambah satu kalimat rangkuman, mis. *"Minggu ini perkiraan tepat 5 dari 7 hari. Rata-rata meleset Rp 45.000 per hari."*

### 2.3 Label sumber dalam bahasa owner

| Kondisi teknis | Label di layar |
|---|---|
| Data ≥ 14 hari dan model termuat (development build) | "Dihitung AI di HP ini" |
| Data 7–13 hari, atau model gagal/tidak tersedia (mis. Expo Go) | "Perkiraan sederhana (rata-rata 7 hari terakhir)" |
| Data < 7 hari | "Data belum cukup. Perlu minimal 14 hari penjualan" |
| Galat (data gagal dimuat / `metrics.json` hilang) | Pesan galat berwarna merah, aplikasi tetap jalan |
| Mode data contoh aktif (demo, lihat 5.3 langkah 9) | Pita di atas kartu: "DATA CONTOH — bukan penjualan nyata" |

Label **tidak boleh** menyebut AI bila yang dipakai perkiraan sederhana, dan **tidak boleh** mengklaim lebih akurat daripada kenyataan hasil uji (bagian 6.1).

### 2.4 Aturan yang kami tetapkan (dicatat supaya konsisten)

- **Kisaran omzet** = perkiraan ± √(Σ (harga_i × MAE)²), dengan MAE porsi dari `metrics.json` dan galat antarproduk dianggap saling bebas. Ini kisaran kasar, bukan jaminan dan bukan persentase akurasi; batas bawah tidak kurang dari 0.
- **Kategori hari:** selisih |kenyataan − perkiraan| ≤ **15%** dari kenyataan = "Sesuai"; di atas = "Lebih ramai"/"Lebih sepi". Angka 15% ditetapkan sekarang dan tidak diubah setelah melihat hasil.
- **"Hari paling ramai"** hanya ditampilkan bila data ≥ 28 hari. Jika kurang, bagian itu disembunyikan.
- **Pengaman model:** model hanya dipakai bila `metrics.model.MAE < metrics.baseline_ma7.MAE`. Bila setelah pelatihan ulang model kalah, aplikasi otomatis memakai perkiraan sederhana.

## 3. Arsitektur dan Alur Data

### 3.1 Alur ujung ke ujung

```
data_simulasi_produk.csv (laptop) ─► latih_forecast.py / train.py ─► model.tflite + metrics.json
                                                                          │ (disalin ke assets/ai/)
Supabase: transaksi.items ─► porsi per varian, 14 hari terakhir ─► normalisasi ─► model TFLite
        (nama, qty)                       │                                          │ porsi besok per varian
                                          │ gagal / data kurang                      ▼
                                          └──► rata-rata 7 hari (fallback) ──► omzet besok = Σ porsi × harga
```

### 3.2 Satuan data dan skala

- **Satu model untuk semua varian** (seperti modul): window 14 hari semua varian digabung saat latih. Di `data_simulasi_produk.csv`, baris = satu varian di satu tanggal, `qty` = **porsi** terjual. Tidak ada konversi rupiah di model.
- Di aplikasi, deret 14 hari tiap varian dibentuk dari `transaksi.items` (kolom `nama`, `qty`), hari tanpa penjualan bernilai 0, urutan tanggal menaik. Model dipanggil sekali per varian.
- Omzet besok dihitung di aplikasi: **Σ (porsi diperkirakan × harga varian)**. Harga diambil dari tabel produk yang sudah ada (`produk-context`), bukan dari model.

### 3.3 Tangga keputusan (fallback)

| Syarat | Sumber |
|---|---|
| ≥ 14 hari data **dan** model termuat **dan** MAE model < MAE MA7 | `model` |
| 7–13 hari data, model gagal dimuat, atau model kalah dari MA7 | `sederhana` (rata-rata 7 hari) |
| < 7 hari data | `kurang-data` |

"Hari data" = jumlah **tanggal berbeda** yang punya transaksi (seluruh toko), seperti di modul.

### 3.4 Peta file

| File (di `kelompok6/`) | Status | Pemilik |
|---|---|---|
| `buat_data_simulasi.py`, `data_simulasi.csv`, `data_simulasi_produk.csv`, `latih_forecast.py`, `latih_omzet.py`, `model.tflite`, `metrics.json` (di laptop, folder `k4_forecast/`, di luar repo aplikasi) | BARU | Dani |
| `supabase/export-data-latih.sql` | BARU | Dani |
| `assets/ai/model.tflite`, `assets/ai/metrics.json`, `assets/ai/data_contoh.json` | BARU (salinan) | Dani |
| `package.json`, `eas.json`, `metro.config.js` | UBAH/BARU | Dimas |
| `src/lib/ai/forecast-preprocess.ts` | BARU | Dimas |
| `src/lib/ai/forecast-model.ts` | BARU | Dimas |
| `src/lib/ai/forecast-data.ts` | BARU | Alfiah |
| `src/lib/ai/forecast-service.ts` | BARU | Alfiah |
| `src/lib/ai/forecast-evaluasi.ts` | BARU | Alfiah |
| `src/components/organisms/PerkiraanPenjualan.tsx` (+ lembar Cara hitung) | BARU | Istafty |
| `src/app/(owner)/dashboard.tsx` | UBAH (+1 import, +1 baris) | Istafty |
| `src/app/(owner)/laporan.tsx` | UBAH (+1 import, +1 bagian) | Istafty |
| `src/context/auth-context.tsx` | UBAH kecil (penentu Expo Go vs development build) | Dimas |

`src/lib/dashboard-data.ts` (`penjualanHarian`, `produkTerlaris`, `keTanggal`) dan `src/lib/transaksi-api.ts` (`ambilTransaksi`) **sudah ada dan dipakai ulang**, tidak ditulis ulang. `latih_omzet.py` (satu deret omzet) hanya dipertahankan sebagai catatan percobaan (bagian 6.2).

### 3.5 Dataset Sintetis (syarat dari dosen)

Dosen mengizinkan data sintetis untuk tahap pengembangan dengan empat syarat. Penerapannya:

| Syarat dosen | Penerapan |
|---|---|
| 1. Mengacu kondisi asli (menu, harga, estimasi penjualan harian dari wawancara pemilik) | Menu dan harga dibaca dari tabel `produk` (7 produk menjadi 11 varian: Sticky Milk Coklat/Taro/Keju/Foto ukuran S dan L, Smoothies Durian/Mangga, Topping Oreo). Porsi per hari per varian diisi dari wawancara pemilik di tabel `ESTIMASI` skrip: `[isi: ringkasan hasil wawancara dan tanggalnya]` |
| 2. Pola realistis | Akhir pekan lebih ramai (Jumat ×1,10; Sabtu ×1,35; Minggu ×1,40); tren naik 0,15% per hari; kenaikan 8% pada tanggal gajian (1–3 dan 25–28); varian terlaris dan varian niche berbeda (mis. Coklat L paling banyak, Sticky Milk Foto paling sedikit); hari sepi acak (±5% hari, turun 35–55%); variasi harian acak (jumlah porsi berdistribusi Poisson) |
| 3. Transparan di laporan | Pernyataan di bagian atas, 6.1, 7, dan 8 bahwa data sintetis dipakai **karena mitra belum memiliki pembukuan**; skrip pembuatnya (seed tetap) dan kedua CSV dilampirkan; pita "DATA CONTOH" selalu tampil di aplikasi selama mode data contoh aktif |
| 4. Siap menerima data asli | Aplikasi **sudah merekam transaksi nyata**: kasir menyimpan setiap penjualan ke tabel `transaksi` (waktu, total, metode, rincian item). `supabase/export-data-latih.sql` mengubahnya menjadi `data.csv` format `date,menu,qty` per varian. Prosedur retrain di bawah |

**Prosedur retrain dengan data asli** (dikerjakan Dani bila transaksi nyata ≥ 60 hari, disarankan 90–180):
1. Jalankan `supabase/export-data-latih.sql` di Supabase SQL Editor, simpan hasilnya sebagai `data.csv`.
2. Periksa: tanggal berurutan, nama varian wajar, tidak ada angka ganjil. Varian yang baru dijual kurang dari 60 hari dikeluarkan dulu.
3. `python latih_forecast.py --data data.csv --keluar hasil`, baca `metrics.json` (MAE model dibandingkan MA7).
4. Salin `model.tflite` dan `metrics.json` ke `assets/ai/`, matikan `MODE_DATA_CONTOH`, perbarui bagian 6.1 dan 7.

Ekspor sudah diuji pada data yang ada sekarang (menghasilkan 14 baris untuk 7 varian pada 8–9 Nov), sehingga formatnya terbukti benar; jumlah barisnya masih jauh dari cukup untuk dilatih.

---

## 4. Pembagian Tugas dan Kontrak Antar Anggota

### 4.1 Urutan kerja

| Tahap | Dani | Dimas | Alfiah | Istafty |
|---|---|---|---|---|
| A | Latih model dari data sintetis, serahkan model + `metrics.json` | Spike development build | Fungsi data per varian + fallback (tanpa model) | Kerangka kartu dengan data contoh |
| B | Catat riwayat percobaan dan metrik | Preprocessing + inference | Tangga keputusan, omzet, evaluasi | Kartu Dashboard dan Laporan |
| C | Siap retrain bila data nyata ada | Uji model di perangkat | Uji backtest | Uji perangkat, field check, bukti |

Model sintetis tidak boleh dipakai sebagai bukti akurasi nyata; hasilnya dilaporkan sebagai bukti **alur** (bagian 6.1).

### 4.2 Kontrak antar file (jangan diubah tanpa kabar)

```ts
// Dimas — forecast-model.ts
export type Metrik = {
  model: { MAE: number; RMSE: number };
  baseline_ma7: { MAE: number; RMSE: number };
  baseline_konstan: { MAE: number };
  n_test: number;
  data_source: string;
  satuan: 'porsi';
  preprocess: { mu: number; sigma: number };
  window: number;                     // 14
  tanggal_akhir_latih: string;        // 'YYYY-MM-DD'
};
export const metrik: Metrik;                                   // dibaca dari assets/ai/metrics.json
export function muatModel(): Promise<boolean>;                 // false bila gagal / Expo Go
export function prediksiModel(window14Porsi: number[]): Promise<number>; // porsi besok, tidak negatif

// Alfiah — forecast-data.ts
export type SeriVarian = { nama: string; harga: number; seri: number[] }; // porsi/hari, tanggal menaik
export function ambilSeriPerVarian(transaksi: DetailTransaksi[], hari: number, acuan?: Date): SeriVarian[];
export function hitungHariData(transaksi: DetailTransaksi[]): number;

// Alfiah — forecast-service.ts  (dipakai Istafty)
export type Sumber = 'model' | 'sederhana' | 'kurang-data';
export type PerkiraanVarian = { nama: string; harga: number; porsi: number; rata7: number };
export type HasilPerkiraan = {
  sumber: Sumber;
  omzet: number | null;        // Rupiah = Σ porsi × harga
  bawah: number | null;
  atas: number | null;
  omzetRata7: number | null;   // Σ rata7 × harga (pembanding / "biasanya")
  produk: PerkiraanVarian[];
  hariData: number;
  maePorsi: number | null;     // hanya untuk sumber 'model'
  dataContoh: boolean;         // true bila memakai data_contoh.json (mode demo)
  catatan: string;
};
export function hitungPerkiraan(transaksi: DetailTransaksi[], acuan?: Date): Promise<HasilPerkiraan>;
export function perkiraanBerantai(transaksi: DetailTransaksi[], hari: number): Promise<HasilPerkiraan[]>;

// Alfiah — forecast-evaluasi.ts  (dipakai Istafty)
export type KategoriHari = 'sesuai' | 'lebih-ramai' | 'lebih-sepi';
export type BarisEvaluasi = { tanggal: string; perkiraan: number; kenyataan: number; selisih: number; kategori: KategoriHari; dihitungSebagaiBukti: boolean };
export function evaluasiHarian(transaksi: DetailTransaksi[], hari: number): Promise<BarisEvaluasi[]>;
export function rangkumanMingguan(baris: BarisEvaluasi[]): { tepat: number; total: number; rataMeleset: number };
```

Kontrak ini milik tim. Bila Dimas atau Alfiah perlu mengubah tipe, kabari Istafty dan perbarui bagian ini.

---

## 5. Implementasi per Anggota

### 5.1 Dani — Data, Pelatihan, dan Ekspor Model

**Tujuan:** menghasilkan `model.tflite` dan `metrics.json` yang jujur, dengan riwayat percobaan tercatat.

**Langkah**

1. **Siapkan folder `k4_forecast/`** di laptop (di luar repo aplikasi): `buat_data_simulasi.py`, `latih_forecast.py`, `latih_omzet.py`. Bila dosen sudah membagikan paket `ai-models`, salin `train.py`-nya juga (hanya dibaca).
2. **Isi estimasi dari wawancara** (jika angkanya sudah ada) pada tabel `ESTIMASI` di `buat_data_simulasi.py`; angka bawaan hanyalah tebakan sementara. Skrip memakai menu dan harga asli dari tabel `produk`.
3. **Buat data sintetis 180 hari:** `python buat_data_simulasi.py 180`. Keluaran: `data_simulasi_produk.csv` (porsi per varian, dipakai model), `data_simulasi.csv` (omzet total, hanya pembanding), dan `data_contoh.json` (28 hari terakhir per varian untuk mode demo). Seed tetap, hasil bisa diulang. **Aturan:** file ini tidak boleh dinamai `data.csv`, tidak boleh disebut data nyata, dan **tidak boleh dimasukkan ke tabel `transaksi`**. 180 hari dipilih karena 90 hari menghasilkan window latih yang terlalu sedikit (bagian 6.2).
4. **Pasang kebutuhan:** Python 3.10–3.12, `pip install tensorflow numpy`.
5. **Latih satu model dari semua varian (cara modul):**
   - Bila ada `train.py` dosen: `python train.py --data data_simulasi_produk.csv`.
   - Bila tidak: `python latih_forecast.py --data data_simulasi_produk.csv --keluar hasil_produk`.
   Terminal harus mencetak `[data] ...`, `[latih] percobaan seed=...`, `[eval] model ...`, `[eval] base ...`, `[tflite] bentuk input: [1 14 1]`, lalu `[ok] tersimpan: model.tflite, metrics.json`.
6. **Baca `metrics.json`:** `window` = 14, `satuan` = porsi, `keterangan` menyatakan data sintetis. MAE model dibandingkan MAE MA7 **apa adanya**, termasuk `per_menu` (produk mana yang baik dan mana yang tidak). Jangan mengecilkan acak di data atau melatih berulang-ulang sambil melihat hasil uji (bagian 6.2).
7. **Salin hasil** ke `kelompok6/assets/ai/`: `model.tflite`, `metrics.json`, dan `data_contoh.json`. Salin `export-data-latih.sql` ke `kelompok6/supabase/`. Commit ke branch kelompok (bukan CSV sintetis).
8. **Catat riwayat percobaan** (bagian 6.2) dan beri tahu Dimas serta Alfiah bahwa model dan `metrics.json` siap.
9. **Retrain nanti** dengan prosedur bagian 3.5 saat transaksi nyata ≥ 60 hari.

**Checklist**
- [ ] `data_simulasi_produk.csv` 180 hari, 11 varian, tidak dinamai `data.csv`
- [ ] `metrics.json`: `window = 14`, `satuan = porsi`, keterangan sintetis, `tanggal_akhir_latih` terisi
- [ ] MAE model, MA7, dan tebakan konstan tercatat; hasil per menu tercatat
- [ ] `assets/ai/` berisi `model.tflite`, `metrics.json`, `data_contoh.json`
- [ ] Data sintetis **tidak** ada di tabel `transaksi` maupun repo aplikasi
- [ ] Riwayat percobaan (6.2) ditulis lengkap

**Bukti:** tangkapan terminal pelatihan, isi `metrics.json`, 10 baris pertama `data_simulasi_produk.csv`.

---

### 5.2 Dimas — Development Build, Runtime TFLite, Preprocessing, dan Inference

**Tujuan:** model `.tflite` benar-benar berjalan di HP (development build) dan hasilnya benar. Di Expo Go, `muatModel()` mengembalikan `false` tanpa crash.

**Penting:** TFLite adalah modul native dan **tidak ada di Expo Go**. Karena itu tahap ini butuh development build.

**Langkah**

1. **Pasang paket** (di folder `kelompok6/`):
   ```
   npx expo install react-native-fast-tflite react-native-nitro-modules
   npx expo install expo-dev-client
   npx expo install --fix
   npx expo-doctor
   ```
2. **Izinkan Metro membundel `.tflite`** di `metro.config.js`: tambahkan `config.resolver.assetExts.push('tflite');` **sebelum** `module.exports`, dengan tetap mempertahankan `config.maxWorkers = 2`. Gunakan `push`, bukan mengganti array. Lalu `npx expo start -c`.
3. **Buat development build** (EAS Build/cloud atau lokal). Untuk build lokal gunakan JDK 17. Siapkan `eas.json` dengan profil `development` (`developmentClient: true`, `distribution: internal`). **Spike ini wajib dan merupakan bagian dari bukti:** paket `react-native-fast-tflite` tidak menyatakan dukungan eksplisit untuk RN 0.88/SDK 58, jadi jangan menulis "teruji di SDK 58" sebelum spike lolos. Catat hasilnya apa pun itu.
4. **Periksa login Google di development build.** Kode `auth-context.tsx` memakai proxy Expo bila `__DEV__` dan `hostUri` ada. Di development build, `exp://` dan proxy bukan jalur yang tepat; scheme `kelompok6://` bisa dipakai langsung. Ubah penentu agar proxy dipakai **hanya di Expo Go**, mis. dengan `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`. Uji login di Expo Go **dan** development build (koordinasi dengan Dani sebagai pemilik awal file ini). Redirect URL `kelompok6://**` sudah ada di Supabase.
5. **`forecast-preprocess.ts`:** konstanta `WINDOW = 14`, `normalisasi(x, mu, sigma) = (x − mu) / sigma`, `denormalisasi(y, mu, sigma) = y * sigma + mu`. Tidak ada skala rupiah karena satuan model adalah **porsi**. Aturannya: **ubah satu, ubah keduanya**; nilai harus sama dengan skrip latih.
6. **`forecast-model.ts`:** baca `assets/ai/metrics.json` (mu/sigma **tidak** ditulis manual). `muatModel()` memanggil `loadTensorflowModel(require('../../../assets/ai/model.tflite'))` di dalam `try/catch`; bila gagal (Expo Go/web/error), `console.warn('[forecast] model TFLite gagal dimuat', alasan)` dan kembalikan `false`. Muat sekali saja (cache modul). Sertakan pemeriksaan pengaman `metrik.model.MAE < metrik.baseline_ma7.MAE` sebagai fungsi `modelLayak()` yang dipakai Alfiah.
7. **`prediksiModel(window14Porsi)`:** validasi panjang = 14 → normalisasi → `Float32Array` bentuk `[1, 14, 1]` → jalankan model → denormalisasi → `max(0, hasil)`.
8. **Uji bentuk input** dan uji kewajaran dengan window contoh (mis. deret Coklat L dari `data_contoh.json`): hasil harus berada di sekitar rata-rata porsi harian varian itu. Prediksi 0 terus atau puluhan kali lipat berarti ada yang salah di preprocessing.
9. **Uji konsistensi** dengan hasil Python: beri window yang sama ke `prediksiModel` dan ke model di laptop (Dani bisa menjalankan `Interpreter`); selisihnya harus sangat kecil.
10. Bila model diganti (latih ulang), cukup ganti file di `assets/ai/` dan `npx expo start -c`; rebuild hanya perlu bila paket native berubah.

**Checklist**
- [ ] Spike development build lolos (atau kegagalannya dicatat jujur dengan penyebabnya)
- [ ] Metro membundel `.tflite` tanpa error
- [ ] `muatModel()` → `true` di development build, `false` tanpa crash di Expo Go
- [ ] Login Google jalan di Expo Go **dan** development build
- [ ] Prediksi wajar dan konsisten dengan hasil Python

**Bukti:** tangkapan layar build berhasil, log Metro, hasil `prediksiModel` untuk satu window uji beserta pembandingnya.

---

### 5.3 Alfiah — Data per Varian, Fallback, Tangga Keputusan, Omzet, dan Evaluasi

**Tujuan:** menyediakan hasil perkiraan yang **selalu jujur dan tidak pernah crash**, serta data Perkiraan vs Kenyataan.

**Langkah**

1. **`forecast-data.ts`:**
   - `ambilSeriPerVarian(transaksi, hari, acuan)`: dari `transaksi.items` (`nama`, `qty`) bentuk deret porsi per varian untuk N hari terakhir (menaik, hari tanpa penjualan = 0). Harga varian diambil dari tabel produk yang sudah ada.
   - `hitungHariData(transaksi)` menghitung jumlah tanggal berbeda yang punya transaksi (pakai `keTanggal` dari `dashboard-data.ts`).
2. **Fallback sederhana:** `rata7(deret)` = rata-rata 7 hari terakhir per varian.
3. **`forecast-service.ts` — `hitungPerkiraan`:** terapkan tangga keputusan (3.3). Untuk sumber `model`: per varian panggil `prediksiModel`, isi `porsi`, `omzet = Σ porsi × harga`, `omzetRata7 = Σ rata7 × harga`, dan kisaran sesuai aturan 2.4 dengan `maePorsi = metrik.model.MAE`. Untuk `sederhana`: `porsi = rata7`, tanpa kisaran dari MAE. Untuk `kurang-data`: semua angka `null`. **Seluruh pemanggilan model dibungkus `try/catch`; bila gagal, turun ke `sederhana`, bukan melempar galat.** Model dipakai hanya bila `modelLayak()` (Dimas) bernilai benar. Isi `catatan` dengan kalimat yang bisa ditampilkan apa adanya.
4. **`perkiraanBerantai(transaksi, hari)`:** perkiraan 7 hari ke depan per varian; hasil hari ke-n ditambahkan ke window untuk hari ke-n+1. Galat menumpuk makin jauh hari, jadi beri catatan di kode dan label "perkiraan kasar" di kartu.
5. **`forecast-evaluasi.ts` — `evaluasiHarian`:** untuk tiap hari `d` pada N hari terakhir, hitung omzet perkiraan memakai window yang berakhir di `d−1` (Σ porsi × harga), bandingkan dengan omzet nyata hari `d` (jumlah `total`). Kategorikan dengan toleransi 15% (2.4). `rangkumanMingguan` menghitung jumlah hari "sesuai" dari total dan rata-rata selisih absolut dalam rupiah.
6. **Peringatan kejujuran:** evaluasi ini adalah *backtest*. Hari yang ikut data latih membuat hasilnya terlalu bagus. Tandai `dihitungSebagaiBukti = true` **hanya** untuk hari setelah `metrik.tanggal_akhir_latih`; hari lain ditampilkan dengan catatan.
7. **Ringkasan aturan (bukan AI):** `hariPalingRamai(transaksi)` (rata-rata omzet per hari dalam seminggu; hanya bila data ≥ 28 hari) dan `trenMingguIni(transaksi)` (omzet 7 hari terakhir vs 7 hari sebelumnya). Beri komentar bahwa ini aturan biasa.
8. **Uji tanpa model** (Expo Go): `hitungPerkiraan` harus mengembalikan `sederhana` dengan data 7–13 hari, `kurang-data` dengan < 7 hari, dan tidak crash. Uji juga dengan transaksi kosong, dengan model yang sengaja gagal dimuat, dan dengan `metrics.json` yang MAE modelnya sengaja dibuat lebih besar dari MA7 (harus jatuh ke `sederhana`).
9. **Mode data contoh (untuk demo karena data nyata belum ada).** Tambahkan konstanta `MODE_DATA_CONTOH` di `forecast-data.ts` (nilai awal `false`). Bila `true`, `ambilSeriPerVarian` dan `hitungHariData` membaca `assets/ai/data_contoh.json` (format: `{ keterangan, satuan: 'porsi', produk: [{ nama, harga, data: [{ tanggal, qty }] }] }`), **bukan** Supabase, dan `HasilPerkiraan.dataContoh = true` sehingga Istafty menampilkan pita "DATA CONTOH — bukan penjualan nyata". Mode ini tidak menulis apa pun ke basis data. Evaluasi di mode ini diberi catatan bahwa datanya simulasi.

**Checklist**
- [ ] `hitungPerkiraan` mengembalikan tiga sumber dengan benar pada tiga kondisi data
- [ ] Model gagal, atau model kalah dari MA7 → turun ke `sederhana` (diuji), bukan crash
- [ ] Omzet = Σ porsi × harga, diuji dengan contoh hitungan manual
- [ ] Mode data contoh membaca `data_contoh.json`, tidak menulis ke basis data, dan selalu berpita peringatan
- [ ] `evaluasiHarian` dan `rangkumanMingguan` memberi hasil benar pada data contoh
- [ ] Hari yang ikut data latih tidak dihitung sebagai bukti
- [ ] Hasil kerja sesuai kontrak di bagian 4.2

**Bukti:** keluaran tiga kondisi data (tabel kecil), contoh `BarisEvaluasi`, tangkapan layar uji fallback.

---

### 5.4 Istafty — Tampilan Owner, Pengujian di Perangkat, dan Field Check

**Tujuan:** owner memahami fitur ini tanpa penjelasan, dan semua kondisi tampil dengan benar.

**Langkah**

1. **Baca dulu** struktur `dashboard.tsx` (ScrollView, `useTransaksiDashboard`, `RefreshControl`) dan `laporan.tsx`, serta token warna di `design-tokens.ts`. Ikuti gaya yang ada (Poppins, `StickyMilkColors`).
2. **Buat `PerkiraanPenjualan.tsx`** (organism) yang menerima `transaksi` dari hook Dashboard (tidak menambah pemanggilan Supabase) dan memanggil `hitungPerkiraan`. Tiga kartu:
   - **Perkiraan Penjualan Besok:** angka besar `Rp ...`, baris "Kisaran Rp x – Rp y" (hanya bila ada `bawah/atas`), baris tren ("▲ n% lebih ramai dari biasanya" memakai `omzet` vs `omzetRata7`), dan label sumber (2.3).
   - **7 Hari ke Depan:** batang sederhana dengan nama hari; "Paling ramai: ..." hanya bila `hariPalingRamai` mengembalikan nilai; label "perkiraan kasar".
   - **Siapkan Besok:** 3 produk terlaris (S dan L digabung) dengan perkiraan porsi dari `HasilPerkiraan.produk`, label sumber sama dengan kartu pertama.
3. **State yang harus tampil:** memuat ("Menghitung perkiraan…"), hasil model, hasil sederhana, belum cukup data, galat. Teks label diambil dari `HasilPerkiraan.catatan`/`sumber`, **tidak ditulis ulang**.
4. **Lembar [Cara hitung]:** modal kecil berisi (a) dihitung dari berapa hari data, (b) terakhir diperbarui, (c) kalimat "Ini perkiraan, bukan jaminan", dan di baris paling bawah untuk keperluan dosen: sumber, MAE model, MAE rata-rata 7 hari, `n_test`, serta keterangan **data sintetis**. Jangan menulis bahwa model "lebih akurat" bila selisihnya kecil.
5. **Pasang di Dashboard:** `dashboard.tsx` hanya +1 import dan +1 baris `<PerkiraanPenjualan transaksi={transaksi} />` di bawah bagian yang sudah ada. Pastikan tarik-untuk-muat-ulang tetap memperbarui kartu.
6. **Pasang di Laporan:** bagian "Perkiraan vs Kenyataan" memakai `evaluasiHarian` dan `rangkumanMingguan`. Letakkan sebagai komponen terpisah dengan perubahan minimal di `laporan.tsx`.
7. **Pengujian di perangkat** (catat hasil tiap butir):
   - Development build, data ≥ 14 hari → label "Dihitung AI di HP ini"
   - Expo Go → label "Perkiraan sederhana", tidak ada red screen
   - Data < 7 hari → pesan "Data belum cukup"
   - Matikan internet → pesan galat, aplikasi tetap jalan
   - Mode data contoh aktif → pita "DATA CONTOH" tampil di semua kartu
   - Tarik untuk muat ulang → kartu tetap ada
   - Angka masuk akal dibanding penjualan 7 hari terakhir
   - Dashboard ↔ Laporan ↔ tab lain tidak menimbulkan galat
8. **Uji keterbacaan:** minta satu orang di luar tim (idealnya pemilik warung) membaca layar tanpa penjelasan, lalu tanyakan "besok kira-kira dapat berapa?" dan "apa maksud tulisan di bawah angka itu?". Catat jawabannya.
9. **Field check:** setelah transaksi nyata tersedia, catat perkiraan omzet besok (foto layar); besok bandingkan dengan omzet sebenarnya dan tulis selisihnya di 6.3. Bila belum ada transaksi nyata, tulis keterbatasan ini apa adanya.

**Checklist**
- [ ] Pita "DATA CONTOH — bukan penjualan nyata" tampil di semua kartu selama mode data contoh aktif
- [ ] Tiga kartu Dashboard tampil dan memakai bahasa owner (tanpa MAE/MA7/TFLite di layar utama)
- [ ] Label sumber selalu cocok dengan sumber sebenarnya
- [ ] Kelima state diuji, termasuk tanpa internet
- [ ] Perkiraan vs Kenyataan tampil di Laporan, dengan keterangan 3 kategori
- [ ] Lembar Cara hitung berisi angka teknis dan keterangan data sintetis
- [ ] Uji keterbacaan dengan 1 orang di luar tim
- [ ] Field check tercatat (atau keterbatasannya ditulis)

**Bukti:** tangkapan layar tiap state, GIF demo, catatan uji keterbacaan, tabel field check.

---

## 6. Dokumentasi Bukti

| Bukti | Penanggung jawab | Berkas |
|---|---|---|
| `data_simulasi_produk.csv` (cuplikan), `metrics.json`, terminal pelatihan | Dani | `[isi]` |
| Spike development build, log Metro | Dimas | `[isi]` |
| Uji tiga kondisi data dan fallback | Alfiah | `[isi]` |
| Tangkapan layar Dashboard dan Laporan | Istafty | `[isi]` |
| GIF demo Dashboard (development build) | Istafty | `bukti-perkiraan-dashboard.gif` |
| GIF demo Laporan | Istafty | `bukti-perkiraan-laporan.gif` |
| Video demo | Kelompok | `[isi tautan]` |

### 6.1 Metrik model akhir (dari `metrics.json`)

Model: satu Conv1D mini untuk semua varian (Conv1D(16)–Conv1D(16)–GlobalAveragePooling–Dense(12)–Dense(1)), window 14 hari, 3 seed dipilih lewat MAE validasi. Data: sintetis, 180 hari (25 Mei – 20 Nov 2026), 11 varian. Data latih sampai 17 Okt 2026; data uji 18 Okt – 20 Nov 2026 (34 hari × 11 varian = 374 window).

| Metrik (satuan: porsi) | Model TFLite | Baseline MA7 | Tebak rata-rata konstan |
|---|---|---|---|
| MAE | **1,930** | 1,976 | 2,559 |
| RMSE | **2,561** | 2,582 | — |
| `n_test` | 374 | 374 | 374 |
| Jenis data | **SINTETIS** | | |

Hasil per varian (MAE model vs MA7): model lebih baik pada **8 dari 11** varian (Coklat S, Taro L, Taro S, Keju L, Keju S, Foto L, Foto S, Mangga) dan lebih buruk pada 3 varian (Coklat L 3,106 vs 2,857; Durian 1,957 vs 1,819; Topping Oreo 2,457 vs 2,328).

**Kesimpulan metrik (apa adanya):** model sedikit lebih baik daripada MA7 (MAE turun sekitar 2,3%; RMSE turun sekitar 0,8%) dan memenuhi kriteria modul (MAE model < MAE MA7), **tetapi selisihnya kecil**. Ke-374 window berasal dari hanya 34 hari yang saling berkaitan antarvarian, sehingga jumlah pengamatan efektifnya jauh lebih sedikit; kami **tidak** menyimpulkan bahwa model terbukti lebih baik secara bermakna. Angka ini juga mengukur kemampuan model menangkap pola yang kami buat sendiri, **bukan** kinerja pada penjualan Sticky Milk yang sebenarnya.

### 6.2 Riwayat percobaan (ditulis lengkap demi transparansi)

| # | Konfigurasi | Data | MAE model | MAE MA7 | Hasil |
|---|---|---|---|---|---|
| 1 | Satu deret omzet, Conv1D + GlobalAveragePooling | 90 hari, 60 window latih (ribu Rp) | 205,5 | 115,5 | Lebih buruk dari MA7 dan dari tebakan rata-rata (119,1); data latih terlalu sedikit |
| 2 | Idem, validasi kronologis + 5 seed | 180 hari (ribu Rp) | 168,9 | 166,8 | Setara tebakan rata-rata (167,4), belum belajar |
| 3 | Idem, `Flatten` menggantikan GlobalAveragePooling | 180 hari (ribu Rp) | 169,2 | 166,8 | MAE tidak membaik (RMSE 198,9 vs 219,7 lebih baik); dugaan arsitektur sebagai penyebab **tidak terbukti** |
| 4 | **Satu model dari semua varian (cara modul)**, GlobalAveragePooling | 180 hari, 1.155 window latih (porsi) | 1,930 | 1,976 | **Dipakai.** Sedikit lebih baik dari MA7 |

Catatan kejujuran: empat konfigurasi dicoba, dan yang dipakai adalah yang mengikuti desain modul dan mengalahkan MA7. Pemilihan konfigurasi dengan demikian dipengaruhi hasil uji, sehingga angka akhir cenderung sedikit optimistis. Data tidak diubah selama percobaan (data yang sama, seed tetap).

### 6.3 Field check

| Tanggal | Perkiraan | Kenyataan | Selisih | Keterangan |
|---|---|---|---|---|
| `[isi]` | `[isi]` | `[isi]` | `[isi]` | `[isi]` |

## 7. Catatan dan Batasan (ditulis apa adanya)

1. **Data sintetis (batasan utama).** Mitra belum memiliki pembukuan, sehingga model dilatih dari data buatan. Konsekuensinya: (a) metrik tidak boleh dibaca sebagai akurasi nyata; (b) perkiraan untuk Sticky Milk yang sebenarnya belum teruji; (c) demo memakai mode data contoh dengan pita peringatan. Perbaikan: transaksi nyata terkumpul lalu model dilatih ulang (3.5). `[isi: status terakhir pengumpulan data nyata]`
2. **Keunggulan model kecil.** Lihat 6.1: selisih dengan MA7 sekitar 2% dan tidak dapat dinyatakan bermakna. Acak pada jumlah porsi kecil (1–7 gelas per varian) sulit diprediksi oleh model apa pun.
3. **Jumlah data.** Dengan data yang sedikit, hasil bisa berubah banyak antar pelatihan. Percobaan 1 dengan 60 window gagal total (6.2).
4. **Data di aplikasi.** Transaksi nyata di basis data baru 2 hari (data uji). Demo memakai mode data contoh (5.3 langkah 9) yang tidak menulis ke basis data dan selalu berpita peringatan. Data sintetis tidak pernah dimasukkan ke tabel `transaksi`.
5. **Expo Go.** TFLite tidak jalan di Expo Go; di sana aplikasi memakai perkiraan sederhana dan label berubah. Itu perilaku yang diharapkan, bukan kegagalan.
6. **Dukungan paket.** `react-native-fast-tflite` belum menyatakan dukungan resmi untuk RN 0.88; hasil spike: `[isi]`.
7. **Backtest.** Perkiraan vs Kenyataan di Laporan dihitung ulang dari data yang ada, bukan perkiraan yang disimpan sebelumnya. Hanya hari setelah `tanggal_akhir_latih` yang dihitung sebagai bukti.
8. **Kisaran omzet** memakai asumsi galat antarproduk saling bebas; ini kisaran kasar. Perkiraan 7 hari berantai makin tidak pasti pada hari yang jauh.
9. **Tidak dikerjakan:** prediksi laba (butuh harga pokok per produk), deteksi anomali (data kurang), tab Prediksi layar penuh (opsional di modul), dan model terpisah per produk.
10. **Privasi.** Pemrosesan dilakukan di HP dan data latih hanya berisi tanggal, nama varian, dan jumlah porsi.
11. **Perubahan login.** Penentu proxy di `auth-context.tsx` diubah (Dimas, langkah 4); login perlu diuji ulang di Expo Go dan development build.

## 8. Kesimpulan

`[isi setelah pengujian di perangkat: apakah alur lengkap berjalan di development build, apakah fallback bekerja, dan apakah owner paham tampilannya]`

Praktikum ini membangun **alur AI on-device yang lengkap**: pelatihan satu model dari banyak varian, ekspor TFLite, inferensi di HP, fallback yang jujur, serta tampilan yang mudah dipahami owner di Dashboard dan Laporan. Karena mitra belum memiliki pembukuan, model dilatih dari **data sintetis** yang berpola realistis; model sedikit lebih baik dari rata-rata 7 hari pada data uji (MAE 1,930 vs 1,976), tetapi selisih itu kecil dan hanya membuktikan bahwa *mekanisme* AI-nya bekerja, bukan bahwa perkiraannya akurat untuk Sticky Milk. Seluruh klaim mengacu pada `metrics.json` dan riwayat percobaan, tampilan selalu menyebut sumber perkiraan dengan jujur, dan langkah berikutnya adalah mengumpulkan transaksi nyata lalu melatih ulang model.
