// Preprocessing untuk model TFLite perkiraan porsi.
// ATURAN: ubah satu, ubah keduanya. Nilai di sini harus sama dengan skrip pelatihan (Python).
// mu dan sigma TIDAK ditulis di sini; dibaca dari assets/ai/metrics.json (lihat forecast-model.ts).

/** Jumlah hari yang dilihat model. Harus sama dengan `window` di metrics.json. */
export const WINDOW = 14;

export function normalisasi(x: number, mu: number, sigma: number): number {
  return (x - mu) / sigma;
}

export function denormalisasi(y: number, mu: number, sigma: number): number {
  return y * sigma + mu;
}

/**
 * Ubah 14 porsi harian (urutan: terlama -> terbaru) menjadi tensor input.
 * Bentuk tensor yang diharapkan model: [1, 14, 1], float32. Karena hanya ada satu fitur,
 * larik datar 14 angka sudah sama dengan bentuk itu.
 */
export function siapkanInput(window14Porsi: number[], mu: number, sigma: number): Float32Array {
  if (window14Porsi.length !== WINDOW) {
    throw new Error(`Window harus ${WINDOW} angka, diterima ${window14Porsi.length}`);
  }
  const keluaran = new Float32Array(WINDOW);
  for (let i = 0; i < WINDOW; i++) {
    const x = window14Porsi[i];
    if (!Number.isFinite(x)) throw new Error(`Window berisi angka tidak valid pada indeks ${i}`);
    keluaran[i] = normalisasi(x, mu, sigma);
  }
  return keluaran;
}