# Curation uses an unfiltered editor model

## Problem

The original admin page reused the public timeline query. That query intentionally removes hidden and empty chapters, which made hiding irreversible and left no place to edit media. The existing two tables already hold chapter order, media placement, visibility, featured state, and covers, so this work must not add another table.

## Usage

The admin page loads one complete editor model and passes it to the client:

```tsx
const events = await GALLERY.getCurationWorkspace();
return <CuratorClient events={events} />;
```

Each action saves one curator decision, then refreshes the editor, gallery, and story. Public pages continue to use their filtered queries.

## Shape

`getCurationWorkspace()` returns all events and chapters, including hidden and empty chapters, plus visible and hidden renderable media. Media without a chapter appears under Unassigned. The editor uses expandable chapter boards and focused actions for chapter creation, naming, order, visibility, media placement, media order, featured state, media visibility, and covers.

The actions own parent checks, cover membership, destination order, and stale-cover cleanup. The client never sends table-shaped patches. The story derives its sequence from event, chapter, and media sort order and excludes hidden or unassigned content.

## Synthesis decision

Two designs were considered. The chosen design keeps one server projection and focused mutations. It takes the complete state and validation rules from the command-based design, but rejects its three-pane workspace, drag-and-drop ordering, and generic command dispatcher. Labeled buttons and native selects provide the same capability with less client state.

## Tradeoffs accepted

- We accept arrow-based ordering in exchange for accessible controls and no drag-and-drop dependency.
- We accept one saved mutation per decision in exchange for immediate persistence and no draft conflict model.
- We accept loading all renderable media for an event because this archive is small and hidden media must remain recoverable.

## Alternatives considered

A three-pane editor with bulk selection and full-order commands would make large rearrangements faster, but it requires dirty-state handling, transaction-wide validation, and substantially more client coordination. A single saveable draft document has the same problem and makes small changes less reliable.

## Open questions and risks

- If the archive grows into thousands of items, should chapter media load on demand in the admin?
- If cross-event moves become common, should the chapter picker expose every event or keep event changes as a separate action?

## Next implementation step

Exercise every mutation against production-like data and add browser automation when the repository gains an authenticated test setup.
