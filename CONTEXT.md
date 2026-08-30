# Ntheo

Ntheo is a wedding site. It sends invites, collects RSVPs, and holds the photos and videos guests took. This file defines the words we use for the media archive, which is the part of the app with the most ambiguity in it.

## Language

### The archive

**Event**:
A distinct occasion whose media belongs together. The Wedding Weekend is the primary Event. Other Events exist for media captured outside it.
_Avoid_: day, occasion, session

**Chapter**:
A named, ordered stretch of one Event, such as "The Ceremony". Chapters are proposed automatically from gaps in Capture Time and then edited by hand.
_Avoid_: album, section, category, tag

**Media Item**:
One photo or one video. The unit a guest uploads and the unit shown in the gallery.
_Avoid_: asset, file, post, upload

**Moment**:
A burst of Media Items captured within a short window, usually by several guests at once. Density of a Moment is our only signal for what mattered, since nothing in the app records likes or views.
_Avoid_: highlight, peak, cluster

### Time

**Capture Time**:
When the camera recorded the Media Item, read from its own metadata. This is the only ordering we trust, and it is never displayed. It is stored as the wall clock the camera showed, so every reader treats it as UTC.
_Avoid_: date, timestamp, taken-at

**Upload Time**:
When a guest sent the Media Item to Ntheo. Useful for auditing and nothing else. It is never used to place a Media Item on the timeline, because uploads arrived up to three weeks after the wedding.
_Avoid_: created-at, added-on

**The Day**:
Saturday 9 August 2025, the wedding. Every Media Item captured on or after that date is a picture of it, whatever its timestamp says, because sharing a photo onward rewrites its Capture Time. Only items captured on the 9th itself can be placed on a clock.
_Avoid_: the weekend, the wedding weekend, the event

**Undated Item**:
A Media Item whose Capture Time could not be read. It has no position on the timeline and we never invent one for it.
_Avoid_: orphan, unknown, untimed

**Undateable Item**:
A Media Item of The Day whose Capture Time cannot be trusted, because it was stamped after the 9th or is missing entirely. It belongs to The Day but gets no position on the timeline, and lives in the trailing "More from the day" chapter.
_Avoid_: late upload, misdated

### Curation

**Cover**:
The single Media Item that represents an Event or a Chapter. Chosen automatically from the middle of the densest Moment, then overridden by hand.
_Avoid_: thumbnail, hero, featured image

**Featured**:
A Media Item marked by hand as worth surfacing. Featured is an editorial judgement made by a person and beats anything chosen automatically.
_Avoid_: starred, pinned, highlighted

**Hidden**:
A Media Item kept in the archive but not shown. Hiding is how we remove things. We do not delete guests' uploads.
_Avoid_: deleted, archived, removed

### Presentation

**Display Copy**:
A web-safe version of a Media Item whose original a browser cannot render, such as a Nikon raw file. The original is always kept.
_Avoid_: derivative, thumbnail, converted file

**Poster**:
The still frame shown for a video before it plays.
_Avoid_: thumbnail, preview image, cover

**Wash**:
The current Media Item's own colours, blurred and laid behind it in the viewer, so a photograph is surrounded by its own light rather than a black sheet.
_Avoid_: backdrop, overlay, scrim
