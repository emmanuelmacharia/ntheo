# Media metadata is inferred from the stored files, not captured at upload

The app has been live through the wedding and holds 343 items uploaded through UploadThing with no dimensions, capture time, duration, or poster recorded. That history cannot be recreated by changing the upload form, so a one-off script reads the files themselves and backfills what the database never stored.

The files cooperate. UploadThing's CDN answers HTTP range requests, so reading the first 128KB of each item is enough for EXIF, dimensions, GPS, and the embedded JPEG thumbnail that becomes the blur placeholder. That keeps the whole pass at roughly 22MB instead of downloading 1.39GB of originals.

The script runs locally and is resumable through a `metadataStatus` column. It is deliberately not an API route: the site deploys to Netlify, where a function would time out long before 343 files were processed.

## Consequences

New uploads capture the same metadata in the browser at upload time, so this script is a historical cleanup rather than a permanent job.

Image dimensions are written with EXIF orientation already applied. A phone portrait commonly reports 4032x3024 with orientation 6 and actually displays as 3024x4032, so storing the raw header values would hand the layout the wrong aspect ratio for a large share of the library.
