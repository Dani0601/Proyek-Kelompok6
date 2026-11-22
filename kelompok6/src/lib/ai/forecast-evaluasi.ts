/**
 * forecast-evaluasi.ts (Alfiah)
 *
 * "Perkiraan vs Kenyataan" untuk layar Laporan (Istafty). Ini BACKTEST: perkiraan setiap hari dihitung
 * ulang dari data yang ada pada hari sebelumnya, bukan perkiraan lama yang pernah disimpan.
 */
import * as ForecastModel from './forecast-model';
import { geserHari, modeContohAktif, omzetPadaTanggal, tentukanAcuan } from './forecast-data';
import { hitungPerkiraan } from './forecast-service';
import { keTanggal } from '@/lib/dashboard-data';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

export type KategoriHari = 'sesuai' | 'lebih-ramai' | 'lebih-sepi';

export type BarisEvaluasi = {
  tanggal: string; // 'YYYY-MM-DD'
  perkiraan: number; // Rupiah
  kenyataan: number; // Rupiah (jumlah `total` transaksi hari itu)
  selisih: number; // kenyataan - perkiraan (positif = lebih ramai dari perkiraan)
  kategori: KategoriHari;
  dihitungSebagaiBukti: boolean;
};

/** Toleransi 15% dari kenyataan (ditetapkan di laporan 2.4; tidak diubah setelah melihat hasil). */
const TOLERANSI_PERSEN = 15;
const BATAS_HARI = 366;

/**
 * Selisih |kenyataan - perkiraan| <= 15% dari kenyataan = 'sesuai'. Dihitung dengan bilangan bulat
 * (|selisih| × 100 <= kenyataan × 15) agar tidak kena galat pembulatan desimal dan tanpa pembagian.
 */
export function kategorikan(perkiraan: number, kenyataan: number): KategoriHari {
  const selisih = kenyataan - perkiraan;
  if (Math.abs(selisih) * 100 <= kenyataan * TOLERANSI_PERSEN) return 'sesuai';
  return selisih > 0 ? 'lebih-ramai' : 'lebih-sepi';
}

/** Tanggal terakhir yang dipakai melatih model, atau null bila metrik tidak terbaca / formatnya salah. */
function tanggalAkhirLatih(): string | null {
  try {
    const t = ForecastModel.metrik?.tanggal_akhir_latih;
    return typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * Untuk tiap hari pada `hari` hari terakhir yang SUDAH SELESAI (berakhir kemarin; hari ini belum final
 * sehingga tidak dibandingkan): perkiraan dihitung dari window yang berakhir di H-1, lalu dibandingkan
 * dengan omzet kenyataan hari H. Urutan tanggal menaik.
 *
 * `akhir` (opsional) = hari terakhir yang dievaluasi. Bawaan: kemarin; pada mode data contoh,
 * tanggal terakhir data contoh.
 *
 * Hari yang perkiraannya 'kurang-data' dilewati (tidak ada angka untuk dibandingkan).
 *
 * dihitungSebagaiBukti = true HANYA bila tanggalnya setelah metrik.tanggal_akhir_latih (hari yang ikut
 * melatih model membuat hasil terlalu bagus), dan data bukan data contoh/simulasi, dan tanggal_akhir_latih terbaca.
 */
export async function evaluasiHarian(
  transaksi: DetailTransaksi[],
  hari: number,
  akhir?: Date
): Promise<BarisEvaluasi[]> {
  const n = Math.min(Math.floor(hari), BATAS_HARI);
  if (!Number.isFinite(n) || n < 1) return [];

  const contoh = modeContohAktif();
  const hariTerakhir =
    akhir instanceof Date && !Number.isNaN(akhir.getTime())
      ? akhir
      : contoh
      ? tentukanAcuan() // = tanggal terakhir data contoh
      : geserHari(new Date(), -1);
  const akhirLatih = tanggalAkhirLatih();

  const baris: BarisEvaluasi[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = geserHari(hariTerakhir, -i);
    const tanggal = keTanggal(d);

    // Hanya data sampai H-1 yang boleh dipakai untuk memperkirakan hari H.
    const perk = await hitungPerkiraan(transaksi, geserHari(d, -1));
    if (perk.omzet === null) continue;

    const kenyataan = Math.round(omzetPadaTanggal(transaksi, tanggal));
    const perkiraan = perk.omzet;
    baris.push({
      tanggal,
      perkiraan,
      kenyataan,
      selisih: kenyataan - perkiraan,
      kategori: kategorikan(perkiraan, kenyataan),
      dihitungSebagaiBukti: !contoh && akhirLatih !== null && tanggal > akhirLatih,
    });
  }
  return baris;
}

/** tepat = jumlah hari 'sesuai'; total = jumlah hari yang dievaluasi; rataMeleset = rata-rata |selisih| (Rp). */
export function rangkumanMingguan(baris: BarisEvaluasi[]): { tepat: number; total: number; rataMeleset: number } {
  const total = baris.length;
  if (total === 0) return { tepat: 0, total: 0, rataMeleset: 0 };
  const tepat = baris.filter((b) => b.kategori === 'sesuai').length;
  const rataMeleset = Math.round(baris.reduce((s, b) => s + Math.abs(b.selisih), 0) / total);
  return { tepat, total, rataMeleset };
}