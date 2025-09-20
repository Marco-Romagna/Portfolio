# Database Migrations

This folder stores SQL migrations for the **Pokémon Trends** project (Postgres on Supabase).

- `migrations/001_core.sql` → Core schema (generations, pokemon, sources) + seed data  
- `migrations/002_trends.sql` → Trend data tables and aggregation pipeline
- `migrations/003_rls.sql` → Row-level security and public views (to be added)  

Run migrations in order using the Supabase SQL Editor or `psql`.  
