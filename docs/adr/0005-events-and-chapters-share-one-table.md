# Events and Chapters share one table

The design called for `ntheo_event` and `ntheo_chapter`. Creating the second one failed:

```
The max number of tables allowed for this Database has been reached.
```

`G_DRIVE_TUTORIAL_DB` caps at 10 tables and is shared with an unrelated project that owns 5 `mosaic_*` tables. Ntheo's 5 tables fill the rest, so `ntheo_event` took the last slot and there is no room for another.

Rather than pay for a larger plan to store what will be roughly a dozen rows, Events and Chapters share `ntheo_event` through a nullable `parent_id`. A row with `parent_id` null is an Event. A row with a `parent_id` is a Chapter of that Event. `isEvent` and `isChapter` in `schema.ts` keep the distinction readable at call sites.

## Consequences

Event and Chapter stay separate terms in CONTEXT.md. This is a storage compromise, not a change to the domain language.

Anything else Ntheo needs a table for has to reuse an existing one or displace a `mosaic_*` table. Worth knowing before designing another feature. If the shared database is ever split, this table can be separated back out cheaply, since nothing references chapters by a distinct table name.
