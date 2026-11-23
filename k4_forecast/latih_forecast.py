"""Latih SATU model perkiraan permintaan dari BANYAK menu (cara modul) -> model.tflite + metrics.json

Mengikuti deskripsi modul: window 14 hari per menu, window semua menu digabung menjadi satu
data latih, Conv1D mini Input(14,1) -> Conv1D(16) -> Conv1D(16) -> GlobalAveragePooling ->
Dense(12) -> Dense(1), normalisasi (x - mu) / sigma dengan mu/sigma dari data LATIH,
pembagian kronologis 80/20 PER MENU, MAE/RMSE model vs baseline MA7.

Data: data_simulasi_produk.csv  (kolom date,menu,qty ; qty = porsi per hari per varian)
Jalankan di laptop (butuh: pip install tensorflow numpy):
    python latih_forecast.py --data data_simulasi_produk.csv --keluar hasil_produk
"""
import argparse, csv, datetime as dt, json, os, random
from collections import defaultdict
import numpy as np

W = 14   # harus sama dengan WINDOW di forecast-preprocess.ts


def baca_semua(path):
    d = defaultdict(list)
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            d[r["menu"]].append((dt.date.fromisoformat(r["date"]), float(r["qty"])))
    if not d:
        raise SystemExit(f"File kosong: {path}")
    hasil = {}
    for menu, baris in d.items():
        baris.sort()
        for (a, _), (b, _) in zip(baris, baris[1:]):
            if (b - a).days != 1:
                raise SystemExit(f"[{menu}] tanggal tidak berurutan/bolong: {a} -> {b} (isi hari kosong dengan 0)")
        if len(baris) < 60:
            raise SystemExit(f"[{menu}] hanya {len(baris)} hari; minimal 60 (disarankan 90)")
        hasil[menu] = ([x[0] for x in baris], np.array([x[1] for x in baris], dtype="float32"))
    return hasil


def siapkan(semua, rasio=0.8, rasio_val=0.8):
    """Pembagian kronologis PER MENU: latih(tr+va) | uji. Lalu digabung."""
    bagian = {k: [] for k in ("Xtr", "ytr", "Xva", "yva", "Xuji", "yuji")}
    menu_uji, akhir_latih = [], []
    for menu, (tgl, v) in semua.items():
        X = np.stack([v[i:i + W] for i in range(len(v) - W)])
        y = v[W:]
        k = int(len(X) * rasio)
        kv = int(k * rasio_val)
        bagian["Xtr"].append(X[:kv]);  bagian["ytr"].append(y[:kv])
        bagian["Xva"].append(X[kv:k]); bagian["yva"].append(y[kv:k])
        bagian["Xuji"].append(X[k:]);  bagian["yuji"].append(y[k:])
        menu_uji += [menu] * (len(X) - k)
        akhir_latih.append(tgl[W + k - 1])
    g = {k: np.concatenate(v) for k, v in bagian.items()}
    latih_nilai = np.concatenate([g["Xtr"].ravel(), g["ytr"], g["Xva"].ravel(), g["yva"]])
    mu, sigma = float(latih_nilai.mean()), float(latih_nilai.std() or 1.0)
    return g, np.array(menu_uji), mu, sigma, max(akhir_latih)


def ma7(X):
    return X[:, -7:].mean(axis=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--keluar", default=".")
    ap.add_argument("--epoch", type=int, default=300)
    ap.add_argument("--percobaan", type=int, default=3, help="jumlah seed; dipilih lewat MAE validasi")
    a = ap.parse_args()

    random.seed(60); np.random.seed(60)
    semua = baca_semua(a.data)
    g, menu_uji, mu, sigma, tgl_akhir = siapkan(semua)
    nama = os.path.basename(a.data)
    sintetis = "simulasi" in nama.lower() or "sintetis" in nama.lower()
    print(f"[data] {nama}: {len(semua)} menu, window latih={len(g['Xtr'])}, validasi={len(g['Xva'])}, uji={len(g['Xuji'])}",
          "(SINTETIS)" if sintetis else "(REAL)")

    import tensorflow as tf
    norm = lambda v: (v - mu) / sigma
    x_tr, y_tr = norm(g["Xtr"])[..., None], norm(g["ytr"])
    x_va, y_va = norm(g["Xva"])[..., None], norm(g["yva"])
    x_uji = norm(g["Xuji"])[..., None]
    yu = g["yuji"]

    def bangun():
        return tf.keras.Sequential([
            tf.keras.layers.Input(shape=(W, 1)),
            tf.keras.layers.Conv1D(16, 3, padding="same", activation="relu"),
            tf.keras.layers.Conv1D(16, 3, padding="same", activation="relu"),
            tf.keras.layers.GlobalAveragePooling1D(),
            tf.keras.layers.Dense(12, activation="relu"),
            tf.keras.layers.Dense(1),
        ])

    terbaik, mae_val_terbaik = None, float("inf")
    for seed in range(a.percobaan):
        tf.keras.utils.set_random_seed(seed)
        cand = bangun()
        cand.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="mae")
        cand.fit(x_tr, y_tr, validation_data=(x_va, y_va), epochs=a.epoch, batch_size=32, verbose=0,
                 callbacks=[tf.keras.callbacks.EarlyStopping(patience=30, restore_best_weights=True),
                            tf.keras.callbacks.ReduceLROnPlateau(patience=10, factor=0.5, min_lr=1e-5)])
        mv = float(np.mean(np.abs(cand.predict(x_va, verbose=0).ravel() - y_va))) * sigma
        print(f"[latih] percobaan seed={seed}: MAE validasi={mv:.3f}")
        if mv < mae_val_terbaik:
            terbaik, mae_val_terbaik = cand, mv
    m = terbaik

    pred = np.maximum(m.predict(x_uji, verbose=0).ravel() * sigma + mu, 0)
    base = ma7(g["Xuji"])
    konstan = np.full_like(yu, mu)
    mae = lambda p, y=yu: float(np.mean(np.abs(p - y)))
    rmse = lambda p, y=yu: float(np.sqrt(np.mean((p - y) ** 2)))
    print(f"[eval] model MAE={mae(pred):.3f} RMSE={rmse(pred):.3f}")
    print(f"[eval] base  MAE={mae(base):.3f} RMSE={rmse(base):.3f}   (MA7)")
    print(f"[eval] tebak rata-rata konstan MAE={mae(konstan):.3f}")
    if mae(pred) >= mae(base):
        print("[PERINGATAN] Model TIDAK lebih baik dari MA7. Jangan dipaksakan; laporkan apa adanya.")

    per_menu = {}
    for menu in semua:
        k = menu_uji == menu
        per_menu[menu] = {"model_MAE": round(mae(pred[k], yu[k]), 3), "ma7_MAE": round(mae(base[k], yu[k]), 3)}

    os.makedirs(a.keluar, exist_ok=True)
    tfl = tf.lite.TFLiteConverter.from_keras_model(m).convert()
    open(os.path.join(a.keluar, "model.tflite"), "wb").write(tfl)
    it = tf.lite.Interpreter(model_content=tfl); it.allocate_tensors()
    i_in, i_out = it.get_input_details()[0], it.get_output_details()[0]
    print("[tflite] bentuk input:", i_in["shape"], "(harus [1 14 1])")
    contoh = x_uji[:1].astype("float32")
    it.set_tensor(i_in["index"], contoh); it.invoke()
    selisih = abs(float(it.get_tensor(i_out["index"]).ravel()[0]) - float(m.predict(contoh, verbose=0).ravel()[0]))
    print(f"[tflite] selisih keras vs tflite: {selisih:.6f}")

    json.dump({
        "model": {"MAE": round(mae(pred), 4), "RMSE": round(rmse(pred), 4)},
        "baseline_ma7": {"MAE": round(mae(base), 4), "RMSE": round(rmse(base), 4)},
        "baseline_konstan": {"MAE": round(mae(konstan), 4)},
        "per_menu": per_menu,
        "n_test": int(len(yu)),
        "data_source": nama,
        "keterangan": "SINTETIS (mitra belum punya pembukuan); bukan akurasi nyata" if sintetis else "REAL",
        "satuan": "porsi",
        "preprocess": {"mu": mu, "sigma": sigma},
        "window": W,
        "percobaan_seed": int(a.percobaan),
        "arsitektur": "Conv1D(16)-Conv1D(16)-GlobalAveragePooling-Dense(12)-Dense(1)",
        "tanggal_akhir_latih": tgl_akhir.isoformat(),
        "menu": sorted(semua),
    }, open(os.path.join(a.keluar, "metrics.json"), "w"), indent=2)
    print("[ok] tersimpan: model.tflite, metrics.json")


if __name__ == "__main__":
    main()