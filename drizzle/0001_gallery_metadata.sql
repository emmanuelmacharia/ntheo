-- Gallery rearchitecture, step 1.
--
-- Hand written rather than generated. This repo has no migration history, so
-- `drizzle-kit generate` emits CREATE TABLE for ntheo_user, ntheo_invite and
-- ntheo_media, which already exist and hold live data. Everything below is
-- additive: it adds columns and tables, and never modifies or drops anything.
--
-- Context: CONTEXT.md, docs/adr/0001, docs/adr/0002.

-- Events and Chapters share this one table. The database is capped at 10 tables
-- and is shared with an unrelated mosaic_* project, so a second table was not
-- available. parent_id NULL means Event, parent_id set means Chapter. See
-- docs/adr/0005.
CREATE TABLE `ntheo_event` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` varchar(128) NOT NULL,
	`starts_at` timestamp NULL,
	`ends_at` timestamp NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`cover_media_id` bigint unsigned NULL,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`)
);

-- A Chapter is a row in the same table with parent_id pointing at its Event.
ALTER TABLE `ntheo_event` ADD COLUMN `parent_id` bigint unsigned NULL;

-- Shape. Written with EXIF orientation already applied, so these are the
-- dimensions the browser will actually display.
ALTER TABLE `ntheo_media` ADD COLUMN `width` int NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `height` int NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `lqip` text NULL;

-- Time. NULL captured_at means Undated Item. We never fall back to created_at,
-- which is upload time and lands up to three weeks from the moment shown.
ALTER TABLE `ntheo_media` ADD COLUMN `captured_at` timestamp NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `capture_source` text NOT NULL DEFAULT 'none';

-- Playback and rendering.
ALTER TABLE `ntheo_media` ADD COLUMN `display_url` text NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `poster_url` text NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `duration_seconds` int NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `streamable` boolean NOT NULL DEFAULT true;
ALTER TABLE `ntheo_media` ADD COLUMN `original_filename` text NULL;

-- Captured but deliberately never rendered on a public page.
ALTER TABLE `ntheo_media` ADD COLUMN `gps_lat` double NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `gps_lng` double NULL;

-- Curation.
ALTER TABLE `ntheo_media` ADD COLUMN `event_id` bigint unsigned NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `chapter_id` bigint unsigned NULL;
ALTER TABLE `ntheo_media` ADD COLUMN `sort_order` int NOT NULL DEFAULT 0;
ALTER TABLE `ntheo_media` ADD COLUMN `visible` boolean NOT NULL DEFAULT true;

-- Makes the backfill resumable: pending | ok | failed.
ALTER TABLE `ntheo_media` ADD COLUMN `metadata_status` text NOT NULL DEFAULT 'pending';
