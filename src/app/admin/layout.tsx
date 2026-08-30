import Link from "next/link";
import { redirect } from "next/navigation";
import { authUser } from "~/server/actions/auth";

export const dynamic = "force-dynamic";

/**
 * Curation is staff only. The gallery itself is public for now, which is a
 * deliberate choice; these tools are not.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await authUser();
  if (!user || user instanceof Error) redirect("/");

  return (
    <main className="min-h-screen bg-[#fdfaf6]">
      <div
        className="from-burnt-orange via-burgundy to-gold h-1.5 w-full bg-gradient-to-r"
        style={{ backgroundImage: `url('/african-pattern.png')`, backgroundSize: "300px 300px" }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <nav className="mb-10 flex items-center gap-6 text-sm">
          <Link href="/admin/curate" className="text-burgundy font-medium hover:underline">
            Curate
          </Link>
          <Link href="/admin/backfill" className="text-burgundy font-medium hover:underline">
            Video posters
          </Link>
          <Link href="/gallery" className="text-muted-foreground ml-auto hover:underline">
            View gallery
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
