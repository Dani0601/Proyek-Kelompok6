import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

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
  inputs?: { shape?: number[]; dataType?: string }[];
  run: (input: ArrayBuffer[]) => Promise<ArrayBuffer[]>;
};

// Seperti modul: Expo Go dikenali lewat executionEnvironment atau appOwnership.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as unknown as { appOwnership?: string }).appOwnership === 'expo';

let model: ModelTflite | null = null;
let modelGagal: string | null = null;
let janjiMuat: Promise<boolean> | null = null;

/** true hanya bila model TFLite berhasil dimuat di proses ini. */
export function isTfliteAktif(): boolean {
  return model !== null;
}

/** Alasan model tidak termuat (untuk log/troubleshooting); null bila belum gagal. */
export function alasanModelGagal(): string | null {
  return modelGagal;
}

async function muat(): Promise<boolean> {
  if (model) return true;
  if (modelGagal) return false;

  if (Platform.OS === 'web') {
    modelGagal = 'TFLite tidak didukung di web';
    return false;
  }

  // Jalur TFLite hanya aktif di DEVELOPMENT BUILD. react-native-fast-tflite adalah modul native dan
  // tidak ada di Expo Go: jangan di-require sama sekali, aplikasi memakai perkiraan sederhana (MA7).
  if (isExpoGo) {
    modelGagal = 'TFLite tidak didukung di Expo Go (gunakan APK development/standalone)';
    return false;
  }

  // Pengaman kedua: biner ini (mis. development build lama) belum berisi modul native Nitro.
  // Dicek SEBELUM require, karena require itu sendiri langsung melempar ERROR merah.
  const adaNative = TurboModuleRegistry.get('NitroModules') != null || NativeModules.NitroModules != null;
  if (!adaNative) {
    modelGagal =
      'Modul native Nitro tidak ada di aplikasi ini (Expo Go, atau development build lama: build ulang)';
    console.log(
      '[forecast] TFLite dilewati:', modelGagal,
      '| env:', Constants.executionEnvironment, '| owner:', (Constants as unknown as { appOwnership?: string }).appOwnership
    );
    return false;
  }

  try {
    if (metrik.window !== WINDOW) {
      throw new Error(`window di metrics.json (${metrik.window}) tidak sama dengan WINDOW (${WINDOW})`);
    }

    // require DI DALAM fungsi (lazy), supaya aplikasi tidak crash saat modul native tidak ada.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadTensorflowModel } = require('react-native-fast-tflite');
    // API v3: argumen `delegates` ([] = CPU) wajib diisi.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dimuat: ModelTflite = await loadTensorflowModel(require('../../../assets/ai/model.tflite'), []);

    // Verifikasi bentuk: jangan percaya buta bahwa model cocok dengan skrip pelatihan.
    const inp = dimuat.inputs?.[0];
    if (!inp || inp.shape?.[0] !== 1 || inp.shape?.[1] !== WINDOW || inp.shape?.[2] !== 1 || inp.dataType !== 'float32') {
      throw new Error(
        `Bentuk input model tidak cocok: ${JSON.stringify(inp?.shape)} (diharapkan [1, ${WINDOW}, 1] float32)`
      );
    }

    model = dimuat;
    return true;
  } catch (alasan) {
    modelGagal = (alasan as { message?: string })?.message ?? 'Gagal memuat model TFLite';
    // Bila sumber perkiraan tetap "sederhana" di development build, baca pesan ini di Metro.
    console.warn('[forecast] model TFLite gagal dimuat:', modelGagal);
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

  // API v3: masukan berupa ArrayBuffer; keluaran dibaca sebagai Float32Array.
  const keluaran = await model.run([input.buffer as ArrayBuffer]);
  const y = new Float32Array(keluaran[0])[0];
  if (typeof y !== 'number' || !Number.isFinite(y)) throw new Error('Keluaran model tidak valid');

  return Math.max(0, denormalisasi(y, mu, sigma));
}