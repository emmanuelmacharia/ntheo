# Capture time orders the gallery but is never shown

Chapter headers originally read "Saturday afternoon · 3:27 PM to 6:45 PM", and every tile carried a clock label on hover. The owner's judgement was that a precise timestamp on a wedding photo is clutter rather than information, and that guests reading a stamp would reasonably assume it meant when the photo was *sent*, which it does not.

So the times are gone from the interface: no ranges on chapters, no labels on tiles, no clock in the viewer or in the Open Graph title of a shared link. Capture time still does all the work it always did. It orders every Chapter, it decides which Event Day a photo belongs to, and it is what the clustering splits on. It is simply invisible.

## Consequences

Chapter titles like "Saturday afternoon" carry the whole burden of orientation, which raises the value of renaming them in the curator.

`clockLabel` and `rangeLabel` remain in `src/lib/media.ts`, unused by the gallery. They are the natural place to start if the decision is ever revisited.
