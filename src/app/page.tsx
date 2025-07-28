import { Toaster } from "sonner";
import HeroSection from "~/components/HeroSection";
import InviteManagement from "~/components/InviteManagement";
import { authUser } from "../server/actions/auth";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const managedUser = await authUser();

  return (
    <main>
      <HeroSection />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <InviteManagement user={managedUser} />
      </section>
      <Toaster />
    </main>
  );
}
