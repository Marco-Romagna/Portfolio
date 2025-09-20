-- Migration 002 — Raw trend & survey facts (minimal)
-- Schemas: raw
-- Tables: raw.trend_day, raw.survey_obs
-- Goal: store daily trend scores and survey results, normalized & constrained.

create schema if not exists raw;

-- ========== Daily Google Trends (score 0–100) ==========
create table if not exists raw.trend_day (
  id          bigserial primary key,
  pokemon_id  integer  not null references core.pokemon(id),
  source_id   smallint not null references core.sources(id),
  region      text     not null default 'GLOBAL',     -- e.g. 'GLOBAL', 'US', 'JP'
  date        date     not null,
  score       smallint not null check (score between 0 and 100),
  pulled_at   timestamptz not null default now(),
  -- prevent duplicates (same day/source/pokemon/region)
  unique (source_id, pokemon_id, region, date)
);

-- helpful indexes for common filters
create index if not exists idx_trend_day_pokemon_date on raw.trend_day(pokemon_id, date);
create index if not exists idx_trend_day_region_date  on raw.trend_day(region, date);

-- ========== Survey observations (rank/percent/votes) ==========
create table if not exists raw.survey_obs (
  id           bigserial primary key,
  pokemon_id   integer  not null references core.pokemon(id),
  source_id    smallint not null references core.sources(id),
  survey_name  text     not null,        -- e.g. 'TPC Favorite Pokémon 2023'
  survey_date  date     not null,
  metric       text     not null check (metric in ('rank','percent','votes')),
  value_num    numeric  not null,        -- numeric value for the metric
  region       text     not null default 'GLOBAL',
  pulled_at    timestamptz not null default now(),
  -- avoid duplicate entries for the same metric point
  unique (source_id, pokemon_id, survey_name, survey_date, metric, region)
);

create index if not exists idx_survey_pokemon_date on raw.survey_obs(pokemon_id, survey_date);
create index if not exists idx_survey_source_name   on raw.survey_obs(source_id, survey_name);

-- ========== Tiny helpers (optional but handy) ==========

-- Upsert one daily trend datapoint by source code + pokemon slug
create or replace function raw.upsert_trend_day_by_slug(
  p_source_code text,
  p_pokemon_slug text,
  p_region text,
  p_date date,
  p_score smallint
) returns void language plpgsql as $$
declare
  v_source_id smallint;
  v_pokemon_id integer;
begin
  select id into v_source_id from core.sources where code = p_source_code;
  if v_source_id is null then
    raise exception 'Unknown source code: %', p_source_code;
  end if;

  select id into v_pokemon_id from core.pokemon where slug = p_pokemon_slug;
  if v_pokemon_id is null then
    raise exception 'Unknown pokemon slug: %', p_pokemon_slug;
  end if;

  insert into raw.trend_day (pokemon_id, source_id, region, date, score)
  values (v_pokemon_id, v_source_id, coalesce(nullif(p_region,''),'GLOBAL'), p_date, p_score)
  on conflict (source_id, pokemon_id, region, date) do update
    set score = excluded.score,
        pulled_at = now();
end;
$$;

-- Insert a survey metric by pokemon slug
create or replace function raw.insert_survey_obs_by_slug(
  p_source_code text,
  p_pokemon_slug text,
  p_survey_name text,
  p_survey_date date,
  p_metric text,           -- 'rank' | 'percent' | 'votes'
  p_value numeric,
  p_region text default 'GLOBAL'
) returns void language plpgsql as $$
declare
  v_source_id smallint;
  v_pokemon_id integer;
begin
  if p_metric not in ('rank','percent','votes') then
    raise exception 'Invalid metric: %', p_metric;
  end if;

  select id into v_source_id from core.sources where code = p_source_code;
  if v_source_id is null then
    raise exception 'Unknown source code: %', p_source_code;
  end if;

  select id into v_pokemon_id from core.pokemon where slug = p_pokemon_slug;
  if v_pokemon_id is null then
    raise exception 'Unknown pokemon slug: %', p_pokemon_slug;
  end if;

  insert into raw.survey_obs (pokemon_id, source_id, survey_name, survey_date, metric, value_num, region)
  values (v_pokemon_id, v_source_id, p_survey_name, p_survey_date, p_metric, p_value, coalesce(nullif(p_region,''),'GLOBAL'))
  on conflict (source_id, pokemon_id, survey_name, survey_date, metric, region) do update
    set value_num = excluded.value_num,
        pulled_at = now();
end;
$$;
