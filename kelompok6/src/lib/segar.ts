/**
 * Pencatat "kapan data terakhir diambil dari Supabase".
 *
 * Banyak layar memuat ulang data setiap kali dibuka (useFocusEffect). Pindah-pindah tab
 * berulang kali jadi menembakkan permintaan yang sama berulang kali, dan tiap permintaan
 * menjadi satu baris log di Supabase. Dengan pencatat ini, data yang baru diambil kurang
 * dari JEDA_SEGAR_MS lalu tidak diambil lagi.
 *
 * Aman karena: (1) tambah/ubah/hapus selalu memuat ulang sendiri, (2) pesanan sinkron lewat
 * realtime, (3) tarik-untuk-muat-ulang tetap memaksa pengambilan baru.
 */
export const JEDA_SEGAR_MS = 30_000;

const waktuAmbil = new Map<string, number>();

/** Tandai data `kunci` baru saja berhasil diambil. */
export const tandaiSegar = (kunci: string) => {
  waktuAmbil.set(kunci, Date.now());
};

/** Tandai data `kunci` basi (mis. sesudah ada perubahan), supaya diambil ulang di kesempatan berikut. */
export const tandaiBasi = (kunci: string) => {
  waktuAmbil.delete(kunci);
};

/** Tandai semua data basi (mis. saat berganti akun). */
export const tandaiBasiSemua = () => {
  waktuAmbil.clear();
};

/** True bila data `kunci` masih segar (diambil kurang dari `jeda` ms lalu). */
export const sudahSegar = (kunci: string, jeda: number = JEDA_SEGAR_MS) => {
  const t = waktuAmbil.get(kunci);
  return t !== undefined && Date.now() - t < jeda;
};
