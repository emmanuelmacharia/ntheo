# Video posters are generated in the browser, not by ffmpeg or a transcoding service

The 31 videos have no poster frames, so they render as grey boxes. Generating posters normally means ffmpeg or a service like Mux, but ffmpeg is not installed on the maintainer's machine and Mux is a monthly bill and a file migration for a one-day archive.

Instead an admin page loads each video in a hidden element, seeks to about one second, paints the frame to a canvas, and uploads the result. This works only because the CDN sends `Access-Control-Allow-Origin: *`, which leaves the canvas untainted and `toBlob` callable. The same code then runs at upload time for every future video, so one implementation covers both the backfill and the ongoing case.

It also sidesteps container parsing: `videoWidth` and `videoHeight` come back from the browser correctly, whereas parsing `tkhd` out of the QuickTime files returned nothing usable.

## Consequences

The backfill has a step a human must click through, and it depends on a CORS header we do not control. If UploadThing ever tightens that header, poster generation for existing files breaks and ffmpeg becomes the fallback.
