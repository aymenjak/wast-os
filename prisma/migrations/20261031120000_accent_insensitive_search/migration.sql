-- Accent-insensitive search ("dem" finds "Démonstration"). unaccent is a trusted extension.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION nexvo_fold(input text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, input)) $$;
