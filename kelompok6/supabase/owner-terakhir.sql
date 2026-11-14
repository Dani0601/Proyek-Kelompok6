-- =====================================================================
-- Pengaman owner terakhir (SUDAH dijalankan: migrasi pengguna_lindungi_owner_terakhir)
-- Owner boleh menambah owner lain dari layar Manajemen Kasir (RLS "owner kelola semua").
-- Trigger ini menolak hapus / nonaktifkan / turunkan role bila itu owner aktif terakhir,
-- supaya tidak ada kondisi tanpa owner (semua orang terkunci).
-- Diuji: tambah owner, nonaktif owner kedua, hapus owner pertama saat ada owner lain (OK);
-- nonaktif, hapus, dan turunkan role owner terakhir (ditolak).
-- =====================================================================
create or replace function public.lindungi_owner_terakhir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and old.aktif
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.aktif)
     and not exists (
       select 1 from public.pengguna
       where role = 'owner' and aktif and id <> old.id
     )
  then
    raise exception 'Tidak boleh: ini satu-satunya owner aktif. Tambahkan owner lain dulu.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke execute on function public.lindungi_owner_terakhir() from public, anon, authenticated;

create trigger pengguna_lindungi_owner_terakhir
before update or delete on public.pengguna
for each row execute function public.lindungi_owner_terakhir();
