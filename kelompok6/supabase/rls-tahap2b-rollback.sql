-- =====================================================================
-- ROLLBACK TAHAP 2b: kembalikan akses publik seperti sebelum cutover
-- Jalankan bila setelah rls-tahap2b-cutover.sql aplikasi tidak bisa memuat data.
-- Policy baru dari tahap 2a tidak dihapus (tidak mengganggu).
-- =====================================================================

-- 1. policy publik lama
create policy bahan_akses_publik on public.bahan for all to anon, authenticated using (true) with check (true);

create policy pesanan_baca on public.pesanan for select to public using (true);
create policy pesanan_ubah on public.pesanan for update to public using (true) with check (true);

create policy produk_baca_publik on public.produk for select to public using (true);
create policy produk_hapus_publik on public.produk for delete to public using (true);
create policy produk_tambah_publik on public.produk for insert to public with check (true);
create policy produk_ubah_publik on public.produk for update to public using (true) with check (true);

create policy stok_masuk_akses_publik on public.stok_masuk for all to anon, authenticated using (true) with check (true);
create policy stok_masuk_baca_publik on public.stok_masuk for select to public using (true);

create policy transaksi_baca_publik on public.transaksi for select to public using (true);
create policy transaksi_tambah_publik on public.transaksi for insert to public with check (true);
create policy transaksi_ubah_publik on public.transaksi for update to public using (true) with check (true);

create policy produk_file_baca_publik on storage.objects for select to public using (bucket_id = 'produk');
create policy produk_file_hapus_publik on storage.objects for delete to public using (bucket_id = 'produk');
create policy produk_file_tambah_publik on storage.objects for insert to public with check (bucket_id = 'produk');
create policy produk_file_ubah_publik on storage.objects for update to public
  using (bucket_id = 'produk') with check (bucket_id = 'produk');

-- 2. izin eksekusi fungsi dikembalikan
grant execute on function public.buat_pesanan(text, text, jsonb) to public, anon;
grant execute on function public.catat_stok_masuk(text, numeric, numeric, text) to public, anon;
grant execute on function public.ubah_stok_masuk(uuid, numeric, numeric, text) to public, anon;
grant execute on function public.hapus_stok_masuk(uuid) to public, anon;

-- 3. buat_pesanan kembali ke versi asli (tanpa pengecekan is_staff)
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
