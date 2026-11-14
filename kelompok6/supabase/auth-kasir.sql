-- =====================================================================
-- TAHAP 1: daftar email yang boleh masuk + RLS tabel pengguna
-- Status: SUDAH dijalankan di project Sticky Milk (migrasi auth_pengguna_dan_rls)
-- Diuji: 13 skenario (owner, kasir, akun asing, owner nonaktif, anon), semua sesuai.
-- =====================================================================

create table public.pengguna (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email))),
  nama text,
  role text not null check (role in ('owner', 'kasir')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pengguna enable row level security;

-- Owner aktif = email di JWT terdaftar di pengguna dengan role owner.
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pengguna
    where email = lower(auth.jwt() ->> 'email') and role = 'owner' and aktif
  );
$$;

-- hanya pengguna yang sudah login yang boleh memanggil is_owner()
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- anon tidak boleh menyentuh tabel ini sama sekali
revoke all on public.pengguna from anon;
grant select, insert, update, delete on public.pengguna to authenticated;

create policy "baca baris sendiri" on public.pengguna for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "owner kelola semua" on public.pengguna for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------
-- BELUM DIJALANKAN: baris owner pertama.
-- Ganti dengan email Google owner yang sebenarnya (huruf kecil), lalu jalankan.
-- Tanpa baris ini tidak ada yang bisa login, dan tahap 2b akan mengunci semua orang.
-- ---------------------------------------------------------------------
-- insert into public.pengguna (email, nama, role)
-- values ('GANTI-DENGAN-EMAIL-OWNER@gmail.com', 'Owner', 'owner');
