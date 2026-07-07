-- Enable Supabase Realtime for flights (run on existing projects after flights-schema.sql)
-- Safe to re-run: ignore errors if tables are already in the publication.

alter publication supabase_realtime add table public.flights;
alter publication supabase_realtime add table public.flight_events;

grant select on public.flights to anon, authenticated;
grant select on public.flight_events to anon, authenticated;
