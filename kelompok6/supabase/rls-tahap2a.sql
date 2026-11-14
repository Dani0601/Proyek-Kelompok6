-- =====================================================================
-- TAHAP 2a: tambah policy berbasis peran (TIDAK mengubah perilaku aplikasi)
-- Status: SUDAH dijalankan (migrasi rls_tahap2a_policy_berbasis_peran)
-- Policy publik lama belum dihapus, jadi aplikasi yang sekarang tetap berjalan.
-- Policy di Postgres bersifat OR: yang baru baru berlaku penuh setelah 2b.
-- =====================================================================

-- Staf = email terdaftar di pengguna dan aktif (owner maupun kasir).
-- Login Google saja tidak cukup: siapa pun bisa punya akun Google, dan
-- Supabase membuat akun untuk siapa pun yang login lewat Google.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pengguna
    where email = lower(auth.jwt() ->> 'email') and aktif
  );
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- produk: semua staf boleh baca, hanya owner yang boleh ubah
create policy produk_staff_baca  on public.produk for select to authenticated using (public.is_staff());
create policy produk_owner_tambah on public.produk for insert to authenticated with check (public.is_owner());
create policy produk_owner_ubah  on public.produk for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy produk_owner_hapus on public.produk for delete to authenticated using (public.is_owner());

-- bahan: semua staf boleh baca, hanya owner yang boleh ubah (stok dipotong lewat buat_pesanan)
create policy bahan_staff_baca  on public.bahan for select to authenticated using (public.is_staff());
create policy bahan_owner_tambah on public.bahan for insert to authenticated with check (public.is_owner());
create policy bahan_owner_ubah  on public.bahan for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy bahan_owner_hapus on public.bahan for delete to authenticated using (public.is_owner());

-- stok_masuk: hanya owner (memuat harga beli)
create policy stok_masuk_owner_semua on public.stok_masuk for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- pesanan: staf boleh baca dan ubah status; baris baru dibuat lewat buat_pesanan
create policy pesanan_staff_baca on public.pesanan for select to authenticated using (public.is_staff());
create policy pesanan_staff_ubah on public.pesanan for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- transaksi: staf boleh baca, tambah, dan ubah (aplikasi memakai upsert)
create policy transaksi_staff_baca  on public.transaksi for select to authenticated using (public.is_staff());
create policy transaksi_staff_tambah on public.transaksi for insert to authenticated with check (public.is_staff());
create policy transaksi_staff_ubah  on public.transaksi for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- bucket produk: hanya owner yang boleh mengelola file (foto tetap tampil lewat URL publik,
-- karena bucket bersifat publik)
create policy produk_file_owner_baca   on storage.objects for select to authenticated
  using (bucket_id = 'produk' and public.is_owner());
create policy produk_file_owner_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'produk' and public.is_owner());
create policy produk_file_owner_ubah   on storage.objects for update to authenticated
  using (bucket_id = 'produk' and public.is_owner()) with check (bucket_id = 'produk' and public.is_owner());
create policy produk_file_owner_hapus  on storage.objects for delete to authenticated
  using (bucket_id = 'produk' and public.is_owner());

-- search_path tetap pada tiga fungsi stok (isi fungsi tidak berubah)
alter function public.catat_stok_masuk(text, numeric, numeric, text) set search_path = public;
alter function public.ubah_stok_masuk(uuid, numeric, numeric, text) set search_path = public;
alter function public.hapus_stok_masuk(uuid) set search_path = public;
