import { Platform } from 'react-native';

import metrikJson from '../../../assets/ai/metrics.json';
import { WINDOW, denormalisasi, siapkanInput } from './forecast-preprocess';

export type Metrik = {
  model: { MAE: number; RMSE: number };
  baseline_ma7: { MAE: number; RMSE: number };
  baseline_konstan: { MAE: number };
  n_test: number;
  data_source: string;
  satuan: 'porsi';
  preprocess: { mu: number; sigma: number };
  window: number; // 14
  tanggal_akhir_latih: string; // 'YYYY-MM-DD'
};

/** Dibaca dari assets/ai/metrics.json (hasil pelatihan Dani). */
export const metrik = metrikJson as Metrik;

type ModelTflite = {
  inputs?: { shape?: number[] }[];
  run: (input: Float32Array[]) => Promise<ArrayLike<number>[]>;
};

let model: ModelTflite | null = null;
let janjiMuat: Promise<boolean> | null = null;

async function muat(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    if (metrik.window !== WINDOW) {
      throw new Error(`window di metrics.json (${metrik.window}) tidak sama dengan WINDOW (${WINDOW})`);
    }

    // require DI DALAM fungsi (lazy): di Expo Go modul native ini tidak ada. Bila diimpor di bagian
    // atas file, aplikasi crash saat dibuka; di sini kegagalannya tertangkap dan jadi `false`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadTensorflowModel } = require('react-native-fast-tflite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dimuat: ModelTflite = await loadTensorflowModel(require('../../../assets/ai/model.tflite'));

    // pengaman: jumlah elemen input model harus 14
    const bentuk = dimuat.inputs?.[0]?.shape;
    if (bentuk && bentuk.reduce((a, b) => a * b, 1) !== WINDOW) {
      throw new Error(`Bentuk input model [${bentuk.join(', ')}] tidak cocok dengan window ${WINDOW}`);
    }

    model = dimuat;
    return true;
  } catch (alasan) {
    console.warn('[forecast] model TFLite gagal dimuat', alasan);
    model = null;
    return false;
  }
}

/** Muat model sekali saja. Mengembalikan false (tanpa crash) bila gagal, mis. di Expo Go atau web. */
export function muatModel(): Promise<boolean> {
  if (!janjiMuat) janjiMuat = muat();
  return janjiMuat;
}

/** Model hanya layak dipakai bila MAE-nya lebih baik daripada rata-rata 7 hari (aturan di laporan 2.4). */
export function modelLayak(): boolean {
  return metrik.model.MAE < metrik.baseline_ma7.MAE;
}

/**
 * Perkiraan porsi besok untuk SATU varian.
 * @param window14Porsi porsi per hari, 14 angka, urutan terlama -> terbaru
 * @returns porsi besok, tidak negatif. Melempar galat bila model belum/tidak termuat
 *          (pemanggil, yaitu forecast-service, membungkusnya dengan try/catch lalu jatuh ke perkiraan sederhana).
 */
export async function prediksiModel(window14Porsi: number[]): Promise<number> {
  if (!(await muatModel()) || !model) throw new Error('Model TFLite tidak tersedia');

  const { mu, sigma } = metrik.preprocess;
  const input = siapkanInput(window14Porsi, mu, sigma);

  const keluaran = await model.run([input]);
  const y = keluaran[0]?.[0];
  if (typeof y !== 'number' || !Number.isFinite(y)) throw new Error('Keluaran model tidak valid');

  return Math.max(0, denormalisasi(y, mu, sigma));
}