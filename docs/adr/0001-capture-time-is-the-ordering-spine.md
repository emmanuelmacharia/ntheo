# Capture time is the ordering spine, and upload time is never a fallback

Guests uploaded in bursts up to three weeks after the wedding: 21 files on 2 August, 131 on 11 August, 166 on 20 August. Ordering the gallery by upload time therefore scrambles the day rather than approximating it, so we order by the capture time read out of each file's own metadata.

When capture time cannot be read we record nothing and the item becomes an Undated Item, shown without a clock label in a trailing "More Moments" chapter. Falling back to upload time was the obvious alternative and we rejected it: it does not degrade gracefully, it silently files a photo three weeks away from the moment it shows.

~~Event days run 04:00 to 04:00 rather than midnight to midnight, because 25 of a 90-photo sample were captured in the 00:00 hour of 10 August, which is the reception on the 9th still going.~~ **Superseded by ADR-0009.** That reading was wrong: the 00:00 group is 57 photographs stamped inside three minutes, which is a bulk re-save rather than a reception. There is no 04:00 boundary any more.

## Consequences

Sampling 90 photos found EXIF on every single one, so the Undated Item path will be rare for photos. It exists mainly for videos, whose capture time comes from the `mvhd` atom and is less reliable.
