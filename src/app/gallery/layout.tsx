import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Gallery | Wanza <> Kiangai",
  description:
    "Photos and videos from our Ntheo, in the order the day actually happened.",
};

/**
 * The `modal` slot renders the intercepted viewer. Opening a photo from inside
 * the gallery shows it over the grid, while a shared link or a refresh lands on
 * the full page at /gallery/[id].
 */
export default function GalleryLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
