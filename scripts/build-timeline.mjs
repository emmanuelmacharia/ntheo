/**
 * Media backfill, stage 4: proposes Events and Chapters.
 *
 * The shape of this comes from one fact about the library: only the photographs
 * taken on the day itself carry trustworthy timestamps. Everything uploaded
 * afterwards was shared around first, by WhatsApp and the like, and re-saving a
 * photo rewrites its EXIF date to the day it was re-saved. The giveaway is a
 * group of 57 photographs stamped inside three minutes, which is a bulk save
 * rather than anyone taking pictures.
 *
 * So the day is one Event, and it holds every item from 9 August onward. Only
 * the material actually captured on the 9th gets placed on a timeline; the rest
 * is of the day too, it simply has no honest position, so it sits together at
 * the end. Anything from before the 9th is a different occasion and keeps its
 * own Event.
 *
 * See docs/adr/0009. Titles are placeholders meant to be renamed in the curator.
 *
 *   node scripts/build-timeline.mjs [--reset] [--dry]
 */
import { connect } from "./lib/db.mjs";

/** The wedding. Everything from this date onward is a picture of it. */
const THE_DAY = "2025-08-09";

const THE_DAY_START = new Date(`${THE_DAY}T00:00:00Z`);
const THE_DAY_END = new Date(`${THE_DAY}T23:59:59Z`);

/** A gap this long means the day moved on to something else. */
const CHAPTER_GAP_MINUTES = 40;

/** Two photos inside this window are part of the same Moment. */
const BURST_WINDOW_SECONDS = 120;

/** Where everything that cannot be placed on the day's timeline goes. */
const SPILLOVER_TITLE = "More from the day";

const args = process.argv.slice(2);
const options = { reset: args.includes("--reset"), dry: args.includes("--dry") };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function describeDate(date) {
  const d = new Date(date);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function clock(date) {
  return date.toISOString().slice(11, 16);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

/** Every chapter here is one Saturday, so the names carry the hour, not the day. */
function partOfDay(hour) {
  if (hour < 11) return "Morning";
  if (hour < 13) return "Midday";
  if (hour < 15) return "Early afternoon";
  if (hour < 17) return "Afternoon";
  if (hour < 20) return "Evening";
  return "Night";
}

/**
 * Picks the Cover for a set of items.
 *
 * Density stands in for a vote: if several guests photographed the same two
 * minutes, that is the moment that mattered. The middle of that burst is the
 * moment itself, rather than someone raising a phone or the crowd dispersing.
 * A hand-Featured item beats all of it.
 */
function pickCover(items) {
  if (!items.length) return null;

  // A Cover is rendered as a still through next/image, which cannot process a
  // QuickTime file, so videos are only considered when a chapter holds nothing
  // else. Their Poster carries them in that case.
  const stills = items.filter((i) => !String(i.type).startsWith("video"));
  const candidates = stills.length ? stills : items;

  const featured = candidates.filter((i) => i.featured);
  const pool = featured.length ? featured : candidates;
  const dated = pool.filter((i) => i.captured_at);
  if (!dated.length) return pool[0].id;

  const byArea = (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0);

  let best = { count: -1, members: [] };
  for (const item of dated) {
    const centre = item.captured_at.getTime();
    const members = dated.filter(
      (other) => Math.abs(other.captured_at.getTime() - centre) <= BURST_WINDOW_SECONDS * 1000,
    );
    if (members.length > best.count) best = { count: members.length, members };
  }

  const members = best.members.sort((a, b) => a.captured_at - b.captured_at);
  const middle = members[Math.floor((members.length - 1) / 2)];
  const sameMoment = members.filter((i) => Math.abs(i.captured_at - middle.captured_at) <= 2000);
  return sameMoment.sort(byArea)[0].id;
}

/** Splits a run of items wherever the shooting stopped for a while. */
function splitOnGaps(items) {
  const chapters = [];
  let current = [];

  for (const item of items) {
    const previous = current[current.length - 1];
    if (previous && (item.captured_at - previous.captured_at) / 60000 > CHAPTER_GAP_MINUTES) {
      chapters.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) chapters.push(current);
  return chapters;
}

const db = await connect();

const [existing] = await db.query("SELECT COUNT(*) AS n FROM ntheo_event");
const existingCount = Number(existing[0].n ?? existing[0].N);
// A dry run writes nothing, so it is always allowed to preview.
if (existingCount > 0 && !options.reset && !options.dry) {
  console.error(
    `ntheo_event already holds ${existingCount} rows. Re-running would discard any\n` +
      `renaming or reordering done in the curator. Pass --reset to rebuild anyway.`,
  );
  await db.end();
  process.exit(1);
}

const [media] = await db.query(
  `SELECT id, captured_at, width, height, featured, type
   FROM ntheo_media
   WHERE metadata_status = 'ok'
   ORDER BY captured_at IS NULL, captured_at, id`,
);

const before = media.filter((m) => m.captured_at && m.captured_at < THE_DAY_START);
const onTheDay = media.filter(
  (m) => m.captured_at && m.captured_at >= THE_DAY_START && m.captured_at <= THE_DAY_END,
);
// Captured after the day, or carrying no date at all. Both are pictures of the
// day whose timestamps we cannot trust, so neither gets a place on the timeline.
const spillover = media.filter(
  (m) => !m.captured_at || m.captured_at > THE_DAY_END,
);

console.log(
  `${media.length} items: ${onTheDay.length} on the day, ` +
    `${spillover.length} of the day but undateable, ${before.length} from before\n`,
);

const events = [];

// The day itself, first.
if (onTheDay.length || spillover.length) {
  const used = new Set();
  const chapters = splitOnGaps(onTheDay).map((items) => {
    let title = partOfDay(items[0].captured_at.getUTCHours());
    if (used.has(title)) title = `${title}, ${clock(items[0].captured_at)}`;
    used.add(title);
    return { title, items, startsAt: items[0].captured_at, endsAt: items[items.length - 1].captured_at };
  });

  if (spillover.length) {
    chapters.push({ title: SPILLOVER_TITLE, items: spillover, startsAt: null, endsAt: null });
  }

  events.push({
    title: describeDate(THE_DAY_START),
    slug: "the-day",
    items: [...onTheDay, ...spillover],
    chapters,
  });
}

// Anything from before the day keeps its own Event, one per date.
const earlierDays = new Map();
for (const item of before) {
  const key = item.captured_at.toISOString().slice(0, 10);
  if (!earlierDays.has(key)) earlierDays.set(key, []);
  earlierDays.get(key).push(item);
}

for (const [day, items] of [...earlierDays.entries()].sort()) {
  const used = new Set();
  const chapters = splitOnGaps(items).map((chapterItems) => {
    let title = partOfDay(chapterItems[0].captured_at.getUTCHours());
    if (used.has(title)) title = `${title}, ${clock(chapterItems[0].captured_at)}`;
    used.add(title);
    return {
      title,
      items: chapterItems,
      startsAt: chapterItems[0].captured_at,
      endsAt: chapterItems[chapterItems.length - 1].captured_at,
    };
  });
  events.push({ title: describeDate(`${day}T12:00:00Z`), slug: slugify(day), items, chapters });
}

for (const event of events) {
  console.log(`${event.title}  (${event.items.length} items, ${event.chapters.length} chapters)`);
  for (const chapter of event.chapters) {
    console.log(`    ${String(chapter.items.length).padStart(4)}  ${chapter.title}`);
  }
}

if (options.dry) {
  console.log("\ndry run, nothing written");
  await db.end();
  process.exit(0);
}

if (options.reset) {
  await db.query("DELETE FROM ntheo_event");
  await db.query("UPDATE ntheo_media SET event_id = NULL, chapter_id = NULL, sort_order = 0");
}

let eventOrder = 0;
for (const event of events) {
  const dated = event.items.filter((i) => i.captured_at);
  const [insert] = await db.query(
    `INSERT INTO ntheo_event (parent_id, title, slug, starts_at, ends_at, sort_order, visible)
     VALUES (NULL, ?, ?, ?, ?, ?, true)`,
    [
      event.title,
      event.slug,
      dated[0]?.captured_at ?? null,
      dated[dated.length - 1]?.captured_at ?? null,
      eventOrder++,
    ],
  );
  const eventId = insert.insertId;

  let chapterOrder = 0;
  for (const chapter of event.chapters) {
    const [chapterInsert] = await db.query(
      `INSERT INTO ntheo_event (parent_id, title, slug, starts_at, ends_at, sort_order, visible)
       VALUES (?, ?, ?, ?, ?, ?, true)`,
      [
        eventId,
        chapter.title,
        `${event.slug}-${chapterOrder + 1}`,
        chapter.startsAt,
        chapter.endsAt,
        chapterOrder++,
      ],
    );
    const chapterId = chapterInsert.insertId;

    let mediaOrder = 0;
    for (const item of chapter.items) {
      await db.query(
        `UPDATE ntheo_media SET event_id = ?, chapter_id = ?, sort_order = ? WHERE id = ?`,
        [eventId, chapterId, mediaOrder++, item.id],
      );
    }

    const cover = pickCover(chapter.items);
    if (cover) {
      await db.query(`UPDATE ntheo_event SET cover_media_id = ? WHERE id = ?`, [cover, chapterId]);
    }
  }

  const eventCover = pickCover(event.items);
  if (eventCover) {
    await db.query(`UPDATE ntheo_event SET cover_media_id = ? WHERE id = ?`, [eventCover, eventId]);
  }
}

const totalChapters = events.reduce((n, e) => n + e.chapters.length, 0);
console.log(`\nwrote ${events.length} events and ${totalChapters} chapters`);
await db.end();
