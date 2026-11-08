# Laporan Praktikum Pertemuan 9 — Pemrograman Mobile I
## Media Penyimpanan: CRUD dengan Supabase (Database + Cloud Storage)
### Studi Kasus: Sistem Informasi Penjualan dan Pengelolaan Stok UMKM Sticky Milk

---

### Identitas Proyek & Praktikum

- **Mata Kuliah:** Pemrograman Mobile I
- **Pertemuan:** 9 (Media Penyimpanan)
- **Dosen Pengampu:** Mohamad Firdaus, M.Kom
- **Tanggal Praktikum:** November 2026
- **Kelas / Kelompok:** Kelas B / Kelompok 6
- **Pembagian Tugas Anggota Kelompok:**
  1. **Dani Hidayat:** Manajemen Produk — CRUD Katalog Produk, Upload Foto Cloud Storage, Validasi Realtime, Filter Kategori, & Auto-Save Draft
  2. **Alfiah Lutfi Sabilah:** Manajemen Stok — CRUD Master Bahan Baku & CRUD Pengadaan Stok Masuk (Belanja Bahan)
  3. **Dimas Faturohman:** Transaksi dan Antrean — Transaksi Penjualan Kasir, Pemotongan Stok Bahan Otomatis, & CRUD Antrean Pesanan Kasir
  4. **Istafty Keva Yuftika:** Riwayat Transaksi dan Laporan — CRUD Riwayat Transaksi Penjualan, Cetak Struk, & Laporan Penjualan / Omzet Owner

---

## 1. Tujuan dan Capaian Praktikum

Praktikum ini bertujuan memigrasikan penyimpanan data lokal (state in-memory) ke backend cloud berbasis **Supabase** (PostgreSQL Database + Cloud Storage) pada aplikasi UMKM Sticky Milk:
1. Membangun project Supabase terintegrasi, skema relasional, tabel dengan tipe `JSONB`, bucket Cloud Storage, serta kebijakan keamanan *Row Level Security* (RLS).
2. Menghubungkan aplikasi React Native + Expo Router (SDK 58) dengan Supabase via klien tunggal terpusat (`@supabase/supabase-js`).
3. Memindahkan seluruh entitas inti (Produk, Bahan Baku, Stok Masuk, Antrean Pesanan, dan Transaksi) ke cloud database.
4. Menerapkan manajemen file foto di Supabase Storage dengan API modern `new File(uri).bytes()`, URL publik, serta penghapusan file lama/yatim saat data diupdate atau dihapus.
5. Menerapkan validasi form secara *realtime* (validasi per-field, visual error setelah blur, penonaktifan tombol simpan saat form invalid, dan validasi wajib adanya resep bahan).
6. Menerapkan fitur nilai tambah: **Filter Kategori Produk** dan **Auto-Save Draft Form** dengan `AsyncStorage`.

---

## 2. Arsitektur Basis Data Cloud (Supabase)

Seluruh tabel dilindungi dengan kebijakan Row Level Security (RLS) publik untuk praktikum, serta relasi *foreign key* antar-entitas.

### 2.1 Skema Tabel `produk` (Modul Manajemen Produk — Dani)
```sql
create table produk (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null check (kategori in ('Minuman', 'Topping')),
  has_sizes boolean not null default false,
  harga_single numeric(12,2) check (harga_single is null or harga_single >= 0),
  harga_s numeric(12,2) check (harga_s is null or harga_s >= 0),
  harga_l numeric(12,2) check (harga_l is null or harga_l >= 0),
  foto_url text,
  resep jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### 2.2 Skema Tabel `bahan` & `stok_masuk` (Modul Manajemen Stok — Alfiah)
```sql
-- 1. Tabel Master Bahan Baku
create table bahan (
  id text primary key,
  nama text not null,
  satuan text not null check (satuan in ('ml', 'gram', 'pcs')),
  stok numeric not null default 0,
  minimum numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Seed awal data bahan baku:
insert into bahan (id, nama, satuan, stok, minimum) values 
  ('1', 'Susu UHT', 'ml', 18500, 10000),
  ('2', 'Bubuk Coklat', 'gram', 1200, 2000),
  ('3', 'Bubuk Taro', 'gram', 2500, 1500),
  ('4', 'Keju Parut', 'gram', 800, 1000),
  ('5', 'Cup Large 22 oz', 'pcs', 150, 100),
  ('6', 'Cup Small 12 oz', 'pcs', 80, 100);

-- 2. Tabel Pengadaan Stok Masuk (Belanja Bahan)
create table stok_masuk (
  id uuid primary key default gen_random_uuid(),
  bahan_id text not null references bahan(id) on delete cascade,
  jumlah numeric not null,
  harga numeric not null,
  catatan text,
  tanggal timestamptz not null default now()
);
```

### 2.3 Skema Tabel `pesanan` (Modul Antrean Kasir — Dimas)
```sql
create table pesanan (
  id text primary key, -- mis. 'A-010'
  produk text not null,
  status text not null default 'Menunggu' check (status in ('Menunggu', 'Diproses', 'Siap')),
  metode text not null check (metode in ('Tunai', 'QRIS')),
  created_at timestamptz not null default now()
);
```

### 2.4 Skema Tabel `transaksi` (Modul Riwayat & Laporan — Keva)
```sql
create table transaksi (
  id text primary key, -- mis. 'TRX-20261107-001'
  antrean_id text,
  total numeric not null,
  bayar numeric not null,
  kembali numeric not null default 0,
  metode text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

### 2.5 Storage Bucket `produk` (Dani)
- Bucket publik bernama `produk` untuk foto katalog makanan/minuman.
- Penamaan file foto terenkripsi timestamp unik: `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`.

---

## 3. Implementasi Kode Program Berdasarkan Pembagian Tugas

### 3.1 Klien Supabase Terpusat (`src/lib/supabase.ts`)
Menginisialisasi klien Supabase `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` yang digunakan bersama oleh seluruh context aplikasi.

### 3.2 Modul 1: Manajemen Produk & Cloud Storage — *Dani Hidayat*
- **`src/context/produk-context.tsx`**: Pemetaan database `ProdukRow` ➔ `Produk`, fungsi async `tambahProduk`, `updateProduk`, `hapusProduk`, upload foto `bytes()`, pembersihan foto yatim, dan sinkronisasi `refresh()`.
- **`src/components/molecules/PriceField.tsx`**: Penambahan props `invalid`, `onBlur`, border merah error, dan pesan error di bawah field.
- **`src/app/(owner)/tambah-produk.tsx`**: Validasi realtime (nama & harga), **validasi resep wajib ada bahan (`resep.length > 0`)**, tombol simpan disabled saat invalid, dan persistensi form draft dengan `AsyncStorage`.
- **`src/app/(owner)/produk.tsx`**: Hook `useFocusEffect`, loading indicator `ActivityIndicator`, hapus produk async, dan **filter chip kategori (Semua, Minuman, Topping)**.
- **`src/app/(owner)/edit-produk.tsx`**: Validasi realtime, validasi wajib bahan resep pada setiap varian, dan penanganan cerdas 3 status foto (tetap, unggah baru, atau hapus).

### 3.3 Modul 2: Manajemen Stok Bahan Baku & Stok Masuk — *Alfiah Lutfi Sabilah*
- **`src/context/bahan-context.tsx`**: Migrasi `bahanList` dari memori lokal ke tabel `bahan` Supabase dan pencatatan belanja ke tabel `stok_masuk`.
- **`src/app/(owner)/stok.tsx` & `tambah-bahan.tsx`**: Menampilkan daftar bahan dari Supabase, filter stok menipis, serta form tambah/edit bahan baku yang tersimpan permanen.
- **`src/app/(owner)/stok-masuk.tsx`**: Form pencatatan belanja pengadaan bahan baku yang otomatis menambah stok di tabel `bahan` dan tersimpan di `stok_masuk`.

### 3.4 Modul 3: Transaksi Penjualan & Antrean Pesanan Kasir — *Dimas Faturohman*
- **`src/context/order-context.tsx`**: Mengubah data antrean kasir dari array lokal ke tabel `pesanan` Supabase.
- **`ubahStatus` async**: Memperbarui status pesanan (*Menunggu* ➔ *Diproses* ➔ *Siap*) di Supabase sehingga kasir dan peracik minuman tersinkronisasi.
- **`src/context/keranjang-context.tsx` (Pemotongan Stok)**: Menjalankan `kurangiStok()` saat transaksi berhasil, yang langsung memotong stok bahan di tabel `bahan` Supabase sesuai komposisi resep produk.

### 3.5 Modul 4: Riwayat Transaksi & Laporan Penjualan — *Istafty Keva Yuftika*
- **`src/context/keranjang-context.tsx`**: Menyimpan nota transaksi penjualan ke tabel `transaksi` Supabase setelah pembayaran selesai.
- **`src/app/(kasir)/riwayat.tsx`**: Menampilkan riwayat transaksi penjualan kasir dan fitur cetak struk.
- **`src/app/(owner)/laporan.tsx`**: Menampilkan rekapitulasi omzet pendapatan, pengeluaran pembelian bahan baku, dan laba bersih UMKM Sticky Milk.

---

## 4. Hasil Uji Coba End-to-End (Checklist Capaian)

| No | Modul / Kriteria Pengujian | Penanggung Jawab | Status | Hasil Pengujian |
|---|---|---|---|---|
| 1 | Uji Koneksi Supabase | Tim | **LOLOS** | Metro console menampilkan koneksi aktif ke Supabase. |
| 2 | Seed awal 5 produk dari Supabase | Dani | **LOLOS** | Layar Manajemen Produk menampilkan data produk database. |
| 3 | Tambah produk baru dengan foto | Dani | **LOLOS** | Foto masuk ke Storage bucket, data tersimpan di tabel `produk`. |
| 4 | Sinkronisasi ke menu kasir | Dani | **LOLOS** | Produk cloud otomatis tampil di layar kasir lengkap dengan fotonya. |
| 5 | Tambah produk tanpa foto | Dani | **LOLOS** | Tersimpan dengan `foto_url: null`, kartu menampilkan warna aksen. |
| 6 | Ubah produk tanpa ganti foto | Dani | **LOLOS** | Data terupdate, URL foto lama tetap terjaga. |
| 7 | Ubah produk dengan ganti foto | Dani | **LOLOS** | Foto baru terunggah, foto lama di bucket terhapus otomatis. |
| 8 | Hapus foto via tombol di Edit | Dani | **LOLOS** | `foto_url` jadi null, file foto lama di Storage terhapus. |
| 9 | Hapus produk | Dani | **LOLOS** | Baris data DB dan file foto di Storage terhapus bersih. |
| 10 | Validasi Realtime Nama & Harga | Dani | **LOLOS** | Field kosong memicu border merah; tombol simpan disable. |
| 11 | **Validasi Wajib Resep Bahan** | Dani | **LOLOS** | Menu tidak bisa disimpan jika belum menambahkan bahan baku. |
| 12 | **Fitur Filter Kategori Produk** | Dani | **LOLOS** | Chip Semua/Minuman/Topping menyaring tampilan menu secara instan. |
| 13 | **Fitur Auto-Save Draft Form** | Dani | **LOLOS** | Form memulihkan isian draft via AsyncStorage jika navigasi tertutup. |
| 14 | **CRUD Master Bahan Baku** | Alfiah | **LOLOS** | Daftar bahan dibaca dari Supabase; tambah & edit bahan tersimpan permanen. |
| 15 | **CRUD Pengadaan Stok Masuk** | Alfiah | **LOLOS** | Form stok masuk menambah stok bahan dan tercatat di tabel `stok_masuk`. |
| 16 | **Potong Stok Bahan Otomatis** | Dimas | **LOLOS** | Transaksi produk di kasir memotong stok di tabel `bahan` Supabase. |
| 17 | **CRUD Antrean Pesanan Kasir** | Dimas | **LOLOS** | Nomor antrean tersimpan di DB; update status pesanan realtime. |
| 18 | **CRUD Riwayat Transaksi** | Keva | **LOLOS** | Data transaksi tersimpan permanen di cloud dan tampil di laporan. |
| 19 | Persistensi Data Cloud | Tim | **LOLOS** | Data seluruh modul tetap utuh setelah aplikasi ditutup dan dibuka ulang. |

---

## 5. Dokumentasi Bukti Pengerjaan (Screenshot & GIF)

> **Petunjuk Anggota Tim:**
> Simpan file screenshot / GIF ke folder proyek, lalu pastikan nama file sesuai dengan atribut `src="..."` pada setiap bagian di bawah ini.

---

### Bagian A: Bukti Modul Manajemen Produk & Cloud Storage (*Dani Hidayat*)

#### A.1 Bukti Koneksi Konsol Metro & Supabase
<div align="center">
  <img src="bukti-koneksi-supabase.png" width="60%" alt="Bukti Koneksi Supabase">
</div>

#### A.2 Tabel `produk` di Table Editor Supabase
<div align="center">
  <img src="bukti-table-editor-produk.png" width="75%" alt="Tabel Produk Supabase">
</div>

#### A.3 Cloud Storage Bucket `produk`
<div align="center">
  <img src="bukti-storage-bucket.png" width="75%" alt="Storage Bucket Produk">
</div>

#### A.4 Layar Manajemen Produk Owner (Data Cloud + Filter Kategori)
<div align="center">
  <img src="bukti-manajemen-produk.gif" width="30%" alt="Manajemen Produk dan Filter Kategori">
</div>

#### A.5 Validasi Realtime & Validasi Wajib Resep Bahan
<div align="center">
  <img src="bukti-validasi-realtime.gif" width="30%" alt="Validasi Realtime Form">
</div>

#### A.6 Tambah Produk dengan Foto Baru
<div align="center">
  <img src="bukti-tambah-produk.gif" width="30%" alt="Tambah Produk dengan Foto">
</div>

#### A.7 Sinkronisasi Produk & Foto Cloud ke Layar Kasir
<div align="center">
  <img src="bukti-kasir-sinkron.png" width="30%" alt="Kasir Sinkron Cloud">
</div>

#### A.8 Edit Produk & Pengujian Tombol Hapus Foto
<div align="center">
  <img src="bukti-edit-produk.gif" width="30%" alt="Edit Produk dan Hapus Foto">
</div>

#### A.9 Hapus Produk & Pembersihan Otomatis File di Storage
<div align="center">
  <img src="bukti-hapus-produk.gif" width="30%" alt="Hapus Produk dan File Storage">
</div>

#### A.10 Auto-Save Draft Form via AsyncStorage
<div align="center">
  <img src="bukti-draft-asyncstorage.gif" width="30%" alt="Draft Form AsyncStorage">
</div>

---

### Bagian B: Bukti Modul Manajemen Stok Bahan Baku & Stok Masuk (*Alfiah Lutfi Sabilah*)

#### B.1 Tabel `bahan` di Supabase
<div align="center">
  <img src="bukti-tabel-bahan.jpeg" width="75%" alt="Tabel Bahan di Supabase">
</div>

#### B.2 Layar Manajemen Stok Bahan Baku (Data dari Supabase)
<div align="center">
  <img src="bukti-layar-stok-bahan.jpeg" width="30%" alt="Layar Stok Bahan Owner">
</div>

#### B.3 Tambah / Edit Bahan Baku
<div align="center">
  <img src="bukti-tambah-edit-bahan.gif" width="30%" alt="Tambah atau Edit Bahan Baku">
</div>

#### B.4 Tabel `stok_masuk` di Supabase
<div align="center">
  <img src="bukti-table-stok-masuk.jpeg" width="75%" alt="Tabel Stok Masuk Supabase">
</div>

#### B.5 Form Pengadaan Stok Bahan Masuk (`stok-masuk.tsx`)
<div align="center">
  <img src="bukti-form-stok-masuk.gif" width="30%" alt="Form Pengadaan Stok Masuk">
</div>

#### B.6 Riwayat Pengadaan & Bertambahnya Stok Bahan
<div align="center">
  <img src="bukti-riwayat-stok-masuk.jpeg" width="30%" alt="Riwayat Pengadaan Bahan">
</div>

---

### Bagian C: Bukti Modul Transaksi Penjualan & Antrean Kasir (*Dimas Faturohman*)

#### C.1 Pemotongan Otomatis Stok Bahan Saat Kasir Checkout
<table>
  <tr>
    <td align="center">
      <img src="bukti-stok-before.png" width="30%" alt="Stok sebelum transaksi">
    </td>
    <td align="center">
      <img src="bukti-stok-after.png" width="30%" alt="Stok sebelum transaksi">
    </td>
  </tr>
</table>

#### C.2 Tabel `pesanan` di Supabase
<div align="center">
  <img src="bukti-tabel-pesanan.png" width="75%" alt="Tabel Pesanan Kasir di Supabase">
</div>

#### C.3 Layar Antrean Pesanan Kasir
<div align="center">
  <img src="bukti-antrean-pesanan.png" width="30%" alt="Layar Antrean Kasir">
</div>

#### C.4 Pengubahan Status Pesanan (*Menunggu* ➔ *Diproses* ➔ *Siap*)
<div align="center">
  <img src="bukti-antrean-pesanan.gif" width="30%" alt="Ubah Status Antrean Realtime">
</div>

#### Bonus (Transaksi Pesanan)
<div align="center">
  <img src="bukti-transaksi.gif" width="30%" alt="Ubah Status Antrean Realtime">
</div>
---

### Bagian D: Bukti Modul Riwayat Transaksi & Laporan (*Istafty Keva Yuftika*)

#### D.1 Tabel `transaksi` di Supabase
<div align="center">
  <img src="bukti supabase transaksi.png" width="75%" alt="Tabel Transaksi Supabase">
</div>

#### D.2 Layar Riwayat Transaksi Kasir & Cetak Struk
<div align="center">
  <img src="Transaksi Kasir & Cetak Struk.gif" width="30%" alt="Riwayat Transaksi dan Cetak Struk">
</div>

#### D.3 Laporan Penjualan & Rekap Omzet Owner
<div align="center">
  <img src="Laporan Penjualan Owner.png" width="30%" alt="Laporan Penjualan Owner">
</div>

---

## 6. Kesimpulan

Praktikum Pertemuan 9 telah berhasil memigrasikan seluruh sistem penyimpanan data aplikasi UMKM Sticky Milk dari penyimpanan memori lokal ke layanan backend cloud **Supabase**.

Kolaborasi tim Kelompok 6 berhasil membagi tanggung jawab ke dalam 4 modul utama:
1. **Manajemen Produk:** Dikerjakan oleh **Dani Hidayat**, mencakup katalog menu, integrasi foto di Supabase Storage, validasi form realtime, validasi wajib resep bahan, filter chip kategori, dan persistensi draft via AsyncStorage.
2. **Manajemen Stok:** Dikerjakan oleh **Alfiah Lutfi Sabilah**, mencakup pengelolaan master bahan baku di tabel `bahan` dan pengadaan belanja bahan di tabel `stok_masuk`.
3. **Transaksi dan Antrean:** Dikerjakan oleh **Dimas Faturohman**, mencakup alur checkout penjualan kasir, pemotongan stok bahan otomatis sesuai resep, serta pengelolaan antrean pesanan di tabel `pesanan`.
4. **Riwayat Transaksi dan Laporan:** Dikerjakan oleh **Istafty Keva Yuftika**, mencakup pencatatan nota penjualan di tabel `transaksi`, riwayat transaksi kasir, cetak struk, serta ringkasan laporan keuangan omzet owner.

Integrasi ini menjadikan aplikasi Sticky Milk memiliki keandalan data yang tinggi, aman berkat aturan Row Level Security (RLS), dan memiliki performa antarmuka yang responsif.
