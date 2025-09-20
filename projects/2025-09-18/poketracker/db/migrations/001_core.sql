-- Migration 001 — Core (minimal)
-- - Schema: core
-- - Tables: sources, pokemon
-- - Gen is derived from national_dex via a generated column.

create schema if not exists core;

-- Dex → Gen mapper (origin generation only)
create or replace function core.generation_from_dex(n int)
returns smallint
immutable language sql as $$
  select case
    when n between   1 and 151  then 1
    when n between 152 and 251  then 2
    when n between 252 and 386  then 3
    when n between 387 and 493  then 4
    when n between 494 and 649  then 5
    when n between 650 and 721  then 6
    when n between 722 and 809  then 7
    when n between 810 and 898  then 8
    when n between 899 and 1025 then 9
    else null
  end;
$$;

-- Where data comes from (Google Trends, surveys, etc.)
create table if not exists core.sources (
  id   smallint generated always as identity primary key,
  code text not null unique,        -- e.g. 'GTRENDS', 'TPC_SURVEY'
  name text not null,
  notes text
);

-- Canonical Pokémon (minimal)
create table if not exists core.pokemon (
  id               integer generated always as identity primary key,
  name             text not null unique,      -- 'Pikachu'
  slug             text not null unique,      -- 'pikachu'
  national_dex     integer not null unique check (national_dex > 0),
  origin_generation smallint
    generated always as (core.generation_from_dex(national_dex)) stored,
  created_at       timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_pokemon_origin_gen on core.pokemon(origin_generation);
create index if not exists idx_pokemon_slug       on core.pokemon(slug);

-- Seed minimal sources
insert into core.sources (code, name) values
  ('GTRENDS','Google Trends'),
  ('TPC_SURVEY','Official TPC Favorite Pokémon Survey')
on conflict (code) do nothing;

-- Seed a small test set (name, slug, dex)
insert into core.pokemon (name, slug, national_dex) values
  ('Pikachu','pikachu',25),
  ('Charizard','charizard',6),
  ('Gengar','gengar',94),
  ('Eevee','eevee',133),
  ('Gardevoir','gardevoir',282),
  ('Lucario','lucario',448),
  ('Garchomp','garchomp',445),
  ('Greninja','greninja',658),
  ('Mimikyu','mimikyu',778),
  ('Sprigatito','sprigatito',906)
on conflict (name) do nothing;
