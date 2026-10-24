# Sticky Milk — Atomic Design

Struktur komponen di `src/components` mengikuti tingkatan Atomic Design:

- `atoms/`: elemen dasar yang dapat digunakan ulang (`AppButton`, `AppInput`).
- `molecules/`: komponen gabungan dengan tanggung jawab spesifik (`ProductCard`, `PriceField`).
- `organisms/`: gabungan molecules yang membentuk bagian antarmuka (`ProductList`).
- `templates/`: kerangka layout halaman (`PageTemplate`).
- `app/`: halaman/rute aplikasi. Halaman menggunakan komponen dari tingkatan di atas, bukan menggandakan implementasi yang sama.

## Design tokens dan CSS

- `src/constants/design-tokens.ts` adalah sumber nilai desain bersama untuk React Native: warna, spacing, radius, dan ukuran tipografi.
- `src/global.css` berisi custom properties untuk kebutuhan web (font dan padanan token visual). React Native iOS/Android tidak membaca CSS web secara langsung, jadi komponen native menggunakan `DesignTokens` dan `StyleSheet`.
- Warna bersama pada layar produk, dashboard, transaksi, dan tab memakai `StickyMilkColors` agar perubahan palet dapat dilakukan terpusat.

## Penggunaan nyata

- `AppButton` dan `AppInput` dipakai pada halaman login serta halaman produk/transaksi.
- `ProductCard` dipakai di daftar produk Owner dan pemilihan produk Kasir.
- `ProductList` dipakai di kedua halaman tersebut untuk menyamakan jarak dan layout daftar.
- `PriceField` dipakai berulang untuk harga produk ukuran S/L atau satu ukuran.
- `PageTemplate` dipakai pada halaman antrean Kasir dan laporan Owner.

Catatan: halaman tetap dapat memiliki `StyleSheet` lokal untuk aturan yang benar-benar spesifik terhadap layar. Yang dipusatkan adalah komponen, token, dan gaya yang berulang—bukan memindahkan semua styling ke satu file CSS yang tidak didukung platform native.
