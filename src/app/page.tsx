import { Toaster } from "sonner";
import HeroSection from "~/components/HeroSection";
import InviteManagement from "~/components/InviteManagement";
import { authUser } from "../server/actions/auth";
import MediaUpload from "~/components/MediaUpload";
import QRSection from "~/components/QRSection";
import Gallery from "~/components/Gallery";
import { Footer } from "~/components/footer";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const managedUser = await authUser();

  return (
    <main>
      <HeroSection />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <InviteManagement user={managedUser} />
        <MediaUpload />
        <QRSection />
        <Gallery />
      </section>
      <section className="footer">
        <Footer />
      </section>
      <Toaster />
    </main>
  );
}
