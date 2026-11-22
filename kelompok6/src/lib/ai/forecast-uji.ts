import { metrik, modelLayak, muatModel, prediksiModel } from './forecast-model';

const tetap = (nilai: number) => Array<number>(14).fill(nilai);

// Pembanding: hasil hitung ulang numpy dari bobot model.tflite (bukan dari TensorFlow).
const KASUS: { nama: string; window: number[]; harapan: number }[] = [
  { nama: '14 x 0', window: tetap(0), harapan: 0 },
  { nama: '14 x 2', window: tetap(2), harapan: 1.9412 },
  { nama: '14 x 8', window: tetap(8), harapan: 8.0975 },
  { nama: '14 x 15', window: tetap(15), harapan: 14.9523 },
  { nama: 'pola mingguan', window: [3, 3, 4, 4, 5, 8, 9, 3, 3, 4, 4, 5, 8, 10], harapan: 4.7781 },
  { nama: 'naik 1..14', window: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], harapan: 7.3173 },
  { nama: 'turun 14..1', window: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], harapan: 8.666 },
];

const TOLERANSI = 0.01;

/** Jalankan sekali untuk membuktikan model berjalan benar di perangkat. Lihat hasil di log Metro. */
export async function jalankanUji(): Promise<void> {
  const siap = await muatModel();
  console.log(
    '[uji-ai] termuat:', siap,
    '| modelLayak:', modelLayak(),
    '| MAE model vs MA7:', metrik.model.MAE, 'vs', metrik.baseline_ma7.MAE
  );
  if (!siap) {
    console.log('[uji-ai] model tidak termuat (Expo Go atau web): aplikasi memakai perkiraan sederhana.');
    return;
  }

  let sesuai = 0;
  for (const kasus of KASUS) {
    try {
      const hasil = await prediksiModel(kasus.window);
      const selisih = Math.abs(hasil - kasus.harapan);
      const ok = selisih < TOLERANSI;
      if (ok) sesuai++;
      console.log(
        `[uji-ai] ${ok ? 'OK  ' : 'BEDA'} ${kasus.nama}: hasil=${hasil.toFixed(4)} harapan=${kasus.harapan.toFixed(4)} selisih=${selisih.toFixed(4)}`
      );
    } catch (galat) {
      console.log('[uji-ai] GALAT', kasus.nama, galat);
    }
  }
  console.log(`[uji-ai] ${sesuai}/${KASUS.length} sesuai pembanding`);
}