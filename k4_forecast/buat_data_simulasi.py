"""Pembuat dataset sintetis Sticky Milk (reproducible, seed tetap).

KONDISI ASLI yang dipakai:
  - Daftar menu + harga: tabel `produk` Supabase (dibaca per 21 Nov 2026).
  - ESTIMASI: porsi terjual per hari (hari biasa) per varian. GANTI angka di ESTIMASI
    dengan hasil wawancara pemilik Sticky Milk, lalu jalankan ulang skrip ini.
POLA yang ditambahkan: akhir pekan ramai, tren naik pelan, gajian (tgl 1-3 & 25-28),
varian terlaris/niche berbeda, hari sepi acak (hujan dsb.), noise harian.
Pemakaian: python buat_data_simulasi.py [jumlah_hari]  (bawaan 90; minimal 60)
Keluaran: data_simulasi.csv (omzet, ribu rupiah) dan data_simulasi_produk.csv (porsi per varian).
"""
import csv, datetime as dt, math, random, sys

SEED = 60
AKHIR = dt.date(2026, 11, 20)
JUMLAH_HARI = int(sys.argv[1]) if len(sys.argv) > 1 else 90   # python buat_data_simulasi.py 180
MULAI = AKHIR - dt.timedelta(days=JUMLAH_HARI - 1)

# (slug, harga jual Rp [dari tabel produk], ESTIMASI porsi/hari biasa -> GANTI dari wawancara)
ESTIMASI = [
    ("sticky_milk_coklat_l", 19000, 7),
    ("sticky_milk_coklat_s", 10000, 5),
    ("sticky_milk_taro_l",   17000, 5),
    ("sticky_milk_taro_s",    9000, 4),
    ("sticky_milk_keju_l",   23000, 3),
    ("sticky_milk_keju_s",   15000, 3),
    ("sticky_milk_foto_l",   15000, 1),
    ("sticky_milk_foto_s",   12000, 2),
    ("smoothies_durian",     26000, 3),
    ("smoothies_mangga",     21000, 4),
    ("topping_oreo",          3000, 5),
]
HARI = [0.92, 0.85, 0.88, 0.95, 1.10, 1.35, 1.40]   # Sen..Min

def poisson(rng, lam):
    if lam <= 0: return 0
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L: return k
        k += 1

rng = random.Random(SEED)
n = (AKHIR - MULAI).days + 1
baris, omzet = [], []
for i in range(n):
    d = MULAI + dt.timedelta(days=i)
    faktor = HARI[d.weekday()] * (1 + 0.0015 * i)
    if d.day <= 3 or 25 <= d.day <= 28: faktor *= 1.08          # gajian
    if rng.random() < 0.05: faktor *= rng.uniform(0.45, 0.65)   # hari sepi
    faktor *= rng.gauss(1, 0.06)
    total = 0
    for slug, harga, dasar in ESTIMASI:
        q = poisson(rng, dasar * faktor)
        baris.append((d.isoformat(), slug, q))
        total += q * harga
    omzet.append((d.isoformat(), round(total / 1000)))

with open("data_simulasi.csv", "w", newline="") as f:
    f.write("date,menu,qty\n")
    for tgl, v in omzet: f.write(f"{tgl},omzet_harian,{v}\n")
with open("data_simulasi_produk.csv", "w", newline="") as f:
    f.write("date,menu,qty\n")
    for tgl, slug, q in baris: f.write(f"{tgl},{slug},{q}\n")

v = [x for _, x in omzet]
ma = [sum(v[i-7:i]) / 7 for i in range(14, n)]
print("hari", n, "omzet(ribu) min/rata/maks", min(v), round(sum(v)/n), max(v))
print("MAE MA7 (semua):", round(sum(abs(a-b) for a, b in zip(ma, v[14:])) / len(ma), 1))
