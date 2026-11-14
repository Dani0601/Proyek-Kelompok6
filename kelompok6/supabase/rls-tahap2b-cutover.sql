-- =====================================================================
-- TAHAP 2b: CUTOVER - cabut akses publik (anon) dari semua tabel lama
-- Status: BELUM dijalankan. Sudah diuji penuh di dalam transaksi yang dibatalkan.
--
-- ⚠ SETELAH SKRIP INI DIJALANKAN, aplikasi yang belum punya login Google
--   TIDAK BISA membaca atau menulis data apa pun (produk, bahan, pesanan, transaksi).
--
-- Jalankan HANYA bila SEMUA ini sudah terpenuhi:
--   1. Baris owner sudah ada di tabel pengguna (lihat auth-kasir.sql).
--   2. Login Google di aplikasi (giliran Dimas) sudah digabung ke main dan bisa dipakai.
--   3. Seluruh anggota tim sudah memakai versi aplikasi dengan login itu.
-- Bila ada masalah: jalankan rls-tahap2b-rollback.sql.
-- =====================================================================

-- 1. hapus policy publik lama
drop policy bahan_akses_publik on public.bahan;
drop policy pesanan_baca on public.pesanan;
drop policy pesanan_ubah on public.pesanan;
drop policy produk_baca_publik on public.produk;
drop policy produk_hapus_publik on public.produk;
drop policy produk_tambah_publik on public.produk;
drop policy produk_ubah_publik on public.produk;
drop policy stok_masuk_akses_publik on public.stok_masuk;
drop policy stok_masuk_baca_publik on public.stok_masuk;
drop policy transaksi_baca_publik on public.transaksi;
drop policy transaksi_tambah_publik on public.transaksi;
drop policy transaksi_ubah_publik on public.transaksi;
drop policy produk_file_baca_publik on storage.objects;
drop policy produk_file_hapus_publik on storage.objects;
drop policy produk_file_tambah_publik on storage.objects;
drop policy produk_file_ubah_publik on storage.objects;

-- 2. fungsi RPC hanya untuk pengguna yang sudah login
revoke execute on function public.buat_pesanan(text, text, jsonb) from public, anon;
revoke execute on function public.catat_stok_masuk(text, numeric, numeric, text) from public, anon;
revoke execute on function public.ubah_stok_masuk(uuid, numeric, numeric, text) from public, anon;
revoke execute on function public.hapus_stok_masuk(uuid) from public, anon;
grant execute on function public.buat_pesanan(text, text, jsonb) to authenticated;
grant execute on function public.catat_stok_masuk(text, numeric, numeric, text) to authenticated;
grant execute on function public.ubah_stok_masuk(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.hapus_stok_masuk(uuid) to authenticated;

-- 3. buat_pesanan berjalan sebagai SECURITY DEFINER (melewati RLS), jadi akun Google
--    asing yang sudah login tetap bisa memanggilnya. Tambah pengecekan is_staff().
--    Isi fungsi selain pengecekan itu SAMA dengan versi Dimas.
create or replace function public.buat_pesanan(p_produk text, p_metode text, p_kebutuhan jsonb)
returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  r record;
  v_kurang text[] := '{}';
  v_nomor int;
  v_id text;
begin
  -- hanya staf terdaftar yang boleh membuat pesanan
  if not public.is_staff() then
    raise exception 'Tidak diizinkan: akun belum terdaftar.';
  end if;

  -- cegah dua kasir mendapat nomor/stok yang bentrok
  perform pg_advisory_xact_lock(hashtext('buat_pesanan'));

  -- kunci baris bahan yang dipakai, lalu cek kecukupan stok
  for r in
    select b.id, b.nama, b.stok, k.value::numeric as perlu
    from bahan b
    join jsonb_each_text(p_kebutuhan) k on k.key = b.id
    for update of b
  loop
    if r.stok < r.perlu then
      v_kurang := v_kurang || r.nama;
    end if;
  end loop;

  if coalesce(array_length(v_kurang, 1), 0) > 0 then
    raise exception 'Stok % tidak cukup untuk pesanan ini.', array_to_string(v_kurang, ', ');
  end if;

  -- potong stok sesuai resep
  update bahan b
  set stok = b.stok - k.value::numeric
  from jsonb_each_text(p_kebutuhan) k
  where k.key = b.id;

  -- nomor antrean berikutnya (A-001, A-002, ...)
  select coalesce(max(substring(id from '^A-(\d+)$')::int), 0) + 1
    into v_nomor
  from pesanan;
  v_id := 'A-' || lpad(v_nomor::text, 3, '0');

  insert into pesanan (id, produk, metode, status)
  values (v_id, p_produk, p_metode, 'Menunggu');

  return v_id;
end;
$fn$;
