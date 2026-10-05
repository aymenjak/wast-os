ALTER TABLE transfer_stations
  ADD COLUMN IF NOT EXISTS lat double precision NOT NULL DEFAULT 36.73,
  ADD COLUMN IF NOT EXISTS lng double precision NOT NULL DEFAULT 3.08;
