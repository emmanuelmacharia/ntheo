# Justified rows replace the grid and masonry toggle

The gallery had a control that switched between a fixed grid and CSS column masonry. Both are wrong for this archive and we removed the choice rather than fixing it.

CSS column masonry fills top to bottom per column, so with a chronological gallery column one holds the morning while column two holds the ceremony, side by side at the same eye level. The entire spine of this gallery is time, so the layout has to read left to right in time order. Justified rows scale each row to a target height and fill the container width exactly, which preserves reading order and never crops.

The fixed grid was worse: it forced every photo into a 200px-tall box with `object-fit: cover`, which cut the subject out of portrait shots. That single line is the origin of the complaint that started this work.

## Consequences

Justified rows need every visible item's aspect ratio before rendering, which is why the metadata backfill in ADR-0002 has to land first. Masonry should not be reintroduced.
