-- PokéLab Etapa 3: identidade, persistência de times e isolamento por usuário.
-- Executar pelo Supabase CLI ou no SQL Editor do projeto Supabase.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length_check check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  )
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  format text not null default 'casual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_length_check check (char_length(btrim(name)) between 1 and 80),
  constraint teams_description_length_check check (
    description is null or char_length(description) <= 500
  ),
  constraint teams_format_check check (format in ('casual'))
);

create table if not exists public.team_pokemon (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  position smallint not null,
  species_id integer not null,
  species_slug text not null,
  form_id integer,
  form_slug text,
  display_name_snapshot text not null,
  sprite_url_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_pokemon_position_check check (position between 1 and 6),
  constraint team_pokemon_species_id_check check (species_id > 0),
  constraint team_pokemon_form_id_check check (form_id is null or form_id > 0),
  constraint team_pokemon_species_slug_check check (char_length(btrim(species_slug)) between 1 and 120),
  constraint team_pokemon_form_pair_check check (
    (form_id is null and form_slug is null) or
    (form_id is not null and form_slug is not null and char_length(btrim(form_slug)) between 1 and 120)
  ),
  constraint team_pokemon_display_name_check check (char_length(btrim(display_name_snapshot)) between 1 and 120),
  constraint team_pokemon_unique_position unique (team_id, position)
);

create table if not exists public.team_pokemon_moves (
  id uuid primary key default gen_random_uuid(),
  team_pokemon_id uuid not null references public.team_pokemon (id) on delete cascade,
  slot smallint not null,
  move_id integer not null,
  move_slug text not null,
  move_name_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_pokemon_moves_slot_check check (slot between 1 and 4),
  constraint team_pokemon_moves_move_id_check check (move_id > 0),
  constraint team_pokemon_moves_slug_check check (char_length(btrim(move_slug)) between 1 and 120),
  constraint team_pokemon_moves_name_check check (char_length(btrim(move_name_snapshot)) between 1 and 120),
  constraint team_pokemon_moves_unique_slot unique (team_pokemon_id, slot),
  constraint team_pokemon_moves_unique_move unique (team_pokemon_id, move_id)
);

create index if not exists teams_owner_id_updated_at_idx
  on public.teams (owner_id, updated_at desc);

create index if not exists team_pokemon_team_id_idx
  on public.team_pokemon (team_id);

create index if not exists team_pokemon_moves_team_pokemon_id_idx
  on public.team_pokemon_moves (team_pokemon_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists team_pokemon_set_updated_at on public.team_pokemon;
create trigger team_pokemon_set_updated_at
before update on public.team_pokemon
for each row execute function public.set_updated_at();

drop trigger if exists team_pokemon_moves_set_updated_at on public.team_pokemon_moves;
create trigger team_pokemon_moves_set_updated_at
before update on public.team_pokemon_moves
for each row execute function public.set_updated_at();

create or replace function public.enforce_team_pokemon_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if tg_op = 'UPDATE' and old.team_id = new.team_id then
    return new;
  end if;

  -- Serializa inserções concorrentes no mesmo time.
  perform 1 from public.teams where id = new.team_id for update;
  if tg_op = 'INSERT' then
    select count(*) into current_count
      from public.team_pokemon
      where team_id = new.team_id;
  else
    select count(*) into current_count
      from public.team_pokemon
      where team_id = new.team_id and id <> old.id;
  end if;

  if current_count >= 6 then
    raise exception using
      errcode = 'check_violation',
      message = 'A team cannot contain more than six Pokémon.';
  end if;

  return new;
end;
$$;

drop trigger if exists team_pokemon_limit on public.team_pokemon;
create trigger team_pokemon_limit
before insert or update of team_id on public.team_pokemon
for each row execute function public.enforce_team_pokemon_limit();

create or replace function public.enforce_team_pokemon_moves_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if tg_op = 'UPDATE' and old.team_pokemon_id = new.team_pokemon_id then
    return new;
  end if;

  -- Serializa alterações concorrentes nos golpes do mesmo Pokémon.
  perform 1 from public.team_pokemon where id = new.team_pokemon_id for update;
  if tg_op = 'INSERT' then
    select count(*) into current_count
      from public.team_pokemon_moves
      where team_pokemon_id = new.team_pokemon_id;
  else
    select count(*) into current_count
      from public.team_pokemon_moves
      where team_pokemon_id = new.team_pokemon_id and id <> old.id;
  end if;

  if current_count >= 4 then
    raise exception using
      errcode = 'check_violation',
      message = 'A team Pokémon cannot contain more than four moves.';
  end if;

  return new;
end;
$$;

drop trigger if exists team_pokemon_moves_limit on public.team_pokemon_moves;
create trigger team_pokemon_moves_limit
before insert or update of team_pokemon_id on public.team_pokemon_moves
for each row execute function public.enforce_team_pokemon_moves_limit();

-- Cria o perfil mínimo automaticamente no cadastro do Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username')), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_pokemon enable row level security;
alter table public.team_pokemon_moves enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (auth.uid() is not null and id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (auth.uid() is not null and id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() is not null and id = auth.uid())
with check (auth.uid() is not null and id = auth.uid());

drop policy if exists teams_select_own on public.teams;
create policy teams_select_own on public.teams
for select to authenticated
using (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists teams_insert_own on public.teams;
create policy teams_insert_own on public.teams
for insert to authenticated
with check (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists teams_update_own on public.teams;
create policy teams_update_own on public.teams
for update to authenticated
using (auth.uid() is not null and owner_id = auth.uid())
with check (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists teams_delete_own on public.teams;
create policy teams_delete_own on public.teams
for delete to authenticated
using (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists team_pokemon_select_own on public.team_pokemon;
create policy team_pokemon_select_own on public.team_pokemon
for select to authenticated
using (exists (
  select 1 from public.teams t
  where t.id = team_pokemon.team_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_insert_own on public.team_pokemon;
create policy team_pokemon_insert_own on public.team_pokemon
for insert to authenticated
with check (exists (
  select 1 from public.teams t
  where t.id = team_pokemon.team_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_update_own on public.team_pokemon;
create policy team_pokemon_update_own on public.team_pokemon
for update to authenticated
using (exists (
  select 1 from public.teams t
  where t.id = team_pokemon.team_id and t.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.teams t
  where t.id = team_pokemon.team_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_delete_own on public.team_pokemon;
create policy team_pokemon_delete_own on public.team_pokemon
for delete to authenticated
using (exists (
  select 1 from public.teams t
  where t.id = team_pokemon.team_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_moves_select_own on public.team_pokemon_moves;
create policy team_pokemon_moves_select_own on public.team_pokemon_moves
for select to authenticated
using (exists (
  select 1
  from public.team_pokemon tp
  join public.teams t on t.id = tp.team_id
  where tp.id = team_pokemon_moves.team_pokemon_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_moves_insert_own on public.team_pokemon_moves;
create policy team_pokemon_moves_insert_own on public.team_pokemon_moves
for insert to authenticated
with check (exists (
  select 1
  from public.team_pokemon tp
  join public.teams t on t.id = tp.team_id
  where tp.id = team_pokemon_moves.team_pokemon_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_moves_update_own on public.team_pokemon_moves;
create policy team_pokemon_moves_update_own on public.team_pokemon_moves
for update to authenticated
using (exists (
  select 1
  from public.team_pokemon tp
  join public.teams t on t.id = tp.team_id
  where tp.id = team_pokemon_moves.team_pokemon_id and t.owner_id = auth.uid()
))
with check (exists (
  select 1
  from public.team_pokemon tp
  join public.teams t on t.id = tp.team_id
  where tp.id = team_pokemon_moves.team_pokemon_id and t.owner_id = auth.uid()
));

drop policy if exists team_pokemon_moves_delete_own on public.team_pokemon_moves;
create policy team_pokemon_moves_delete_own on public.team_pokemon_moves
for delete to authenticated
using (exists (
  select 1
  from public.team_pokemon tp
  join public.teams t on t.id = tp.team_id
  where tp.id = team_pokemon_moves.team_pokemon_id and t.owner_id = auth.uid()
));

revoke all on public.profiles, public.teams, public.team_pokemon, public.team_pokemon_moves from anon;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.teams, public.team_pokemon, public.team_pokemon_moves to authenticated;
