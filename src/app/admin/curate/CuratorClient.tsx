"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from "lucide-react";
import type { EventSummary } from "~/server/db/gallery-queries";
import { moveChapter, renameTimelineNode, setTimelineVisibility } from "~/server/actions/gallery";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

/**
 * The curator. Clustering proposes the structure, this is where a person makes
 * it read like the day they remember: rename a chapter, reorder it, hide it.
 *
 * Deliberately small. Hand-sorting hundreds of photos is work only the owner can
 * do, and the gallery is already correct chronologically without any of it.
 */
export default function CuratorClient({ events }: { events: EventSummary[] }) {
  return (
    <div className="space-y-12">
      {events.map((event) => (
        <section key={event.id}>
          <Row
            id={event.id}
            title={event.title}
            subtitle={`${event.itemCount} moments`}
            heading
          />
          <ul className="mt-3 space-y-2">
            {event.chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <Row
                  id={chapter.id}
                  title={chapter.title}
                  subtitle={`${chapter.itemCount} moments`}
                  canMoveUp={index > 0}
                  canMoveDown={index < event.chapters.length - 1}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  id,
  title,
  subtitle,
  heading,
  canMoveUp,
  canMoveDown,
}: {
  id: number;
  title: string;
  subtitle: string;
  heading?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const next = value.trim();
    setEditing(false);
    if (!next || next === title) {
      setValue(title);
      return;
    }
    startTransition(async () => {
      await renameTimelineNode(id, next);
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        heading ? "bg-gold/10 border-gold/30" : "bg-white",
        pending && "opacity-60",
        hidden && "opacity-40",
      )}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setValue(title);
                setEditing(false);
              }
            }}
            className="h-8"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group flex items-center gap-2 text-left"
          >
            <span className={cn("font-display text-foreground font-semibold", heading ? "text-lg" : "text-base")}>
              {value}
            </span>
            <Pencil className="text-muted-foreground h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
        <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
      </div>

      {!heading && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveUp || pending}
            aria-label="Move up"
            onClick={() => startTransition(async () => void (await moveChapter(id, "up")))}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveDown || pending}
            aria-label="Move down"
            onClick={() => startTransition(async () => void (await moveChapter(id, "down")))}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={hidden ? "Show chapter" : "Hide chapter"}
            onClick={() =>
              startTransition(async () => {
                const next = !hidden;
                setHidden(next);
                await setTimelineVisibility(id, !next);
              })
            }
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
