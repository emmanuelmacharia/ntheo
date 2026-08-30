# Everything from 9 August onward is the day

Supersedes the weekend grouping and the 04:00 event-day boundary in ADR-0001. The ordering spine in that ADR still stands; only the grouping changes.

We had been treating capture dates as literal, which produced a "Wedding Weekend" spanning 9 to 11 August plus separate events for 20 August, and a chapter called "Saturday night" for material stamped just after midnight. The owner's account of what actually happened is different: the wedding was one day, Saturday 9 August, and guests shared their photographs by other means first and uploaded them much later.

The data agrees. The "Saturday night" chapter held **57 photographs stamped between 00:48 and 00:51** on the 10th, three minutes apart end to end. Nobody takes 57 pictures in three minutes across a room full of people; that is a bulk save. Re-saving a photo, which is what happens when it arrives over WhatsApp and gets stored again, rewrites EXIF `DateTimeOriginal` to the moment of the re-save. So every timestamp after the 9th records when a picture was passed along, not when it was taken.

So:

- Anything captured **before** 9 August is a different occasion and keeps its own Event. That is the 22 items from 2 August.
- Anything from **9 August onward** belongs to one Event, the day.
- Within that Event, only material actually captured on the 9th is placed on a timeline, because only those timestamps are trustworthy. It chapters into Midday, Early afternoon and Afternoon across 12:00 to 18:45.
- Everything else from the 9th onward, plus anything with no date at all, goes into a single trailing chapter, "More from the day". 163 items.

## Consequences

Chapter names no longer mention a weekday. Every chapter in the day is the same Saturday, so the names carry the hour instead: "Afternoon", not "Saturday afternoon". Nothing in the gallery claims a photograph was taken on a Sunday, a Monday or a Wednesday any more.

"More from the day" is a large chapter and will stay large. That is the honest shape of the archive: two thirds of it cannot be placed on a clock, and pretending otherwise is what this decision removes.
