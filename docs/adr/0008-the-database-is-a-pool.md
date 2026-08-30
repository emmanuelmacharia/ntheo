# The database handle is a pool, not one connection

`src/server/db/index.ts` opened a single mysql2 connection at module load, behind a top-level `await`, and registered an `error` listener on it per module evaluation. SingleStore closes idle connections and nothing here reconnected, so the dev server died repeatedly during the gallery build, and the repeated listeners produced `MaxListenersExceededWarning: 11 error listeners added to [PromiseConnection]`.

It is now a pool with keepalive, a small connection limit suited to serverless instances, and an error handler attached per connection so a dropped socket is logged and replaced instead of taking the process down.

This mattered more once the gallery landed: every gallery route is `force-dynamic` and reads on each request, where the old code was mostly serving a homepage that read once.
