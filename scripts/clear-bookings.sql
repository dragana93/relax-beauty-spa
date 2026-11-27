-- Deletes all bookings and blocked times from the LOCAL test database.
-- Used by `npm run db:clear`. Never run this with --remote.
DELETE FROM occupied_slots;
DELETE FROM bookings;
DELETE FROM blocks;
