-- Seed the 7 system item types.
--
-- These are reference data the app cannot function without: the item create
-- dialog's type selector is driven by `getSidebarItemTypes()`, which reads
-- every `ItemType` with `isSystem = true`. Until now they were only created by
-- `prisma/seed.ts`, so a database that had been migrated but never seeded had
-- none and showed an empty type selector to every user.
--
-- Idempotent by design — the dev and production branches already hold these
-- rows, and this must be a no-op there.
--
-- NOTE: `ON CONFLICT` deliberately not used. The unique index is on
-- ("userId", "name") and "userId" is NULL for system types; Postgres treats
-- NULLs as distinct in a unique index, so that constraint does not fire for
-- system rows and `ON CONFLICT` would insert a duplicate on every run. The
-- `WHERE NOT EXISTS` guard below mirrors the `findFirst({ isSystem: true,
-- name })` check `prisma/seed.ts` already uses.
--
-- `ItemType.id` has no DB-level default (Prisma generates the cuid client
-- side), so an id is supplied here. `gen_random_uuid()` is built into
-- Postgres 13+ and needs no extension; ids are opaque throughout the app.

INSERT INTO "ItemType" ("id", "name", "icon", "color", "isSystem", "userId")
SELECT
    gen_random_uuid()::text,
    seed."name",
    seed."icon",
    seed."color",
    true,
    NULL
FROM (
    VALUES
        ('snippet', 'Code', '#3b82f6'),
        ('prompt', 'Sparkles', '#8b5cf6'),
        ('command', 'Terminal', '#f97316'),
        ('note', 'StickyNote', '#fde047'),
        ('file', 'File', '#6b7280'),
        ('image', 'Image', '#ec4899'),
        ('link', 'Link', '#10b981')
) AS seed ("name", "icon", "color")
WHERE NOT EXISTS (
    SELECT 1
    FROM "ItemType" existing
    WHERE existing."isSystem" = true
      AND existing."name" = seed."name"
);
