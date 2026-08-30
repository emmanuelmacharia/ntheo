import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, LaptopMinimalCheck } from "lucide-react";
import Link from "next/link";
import { authUser } from "~/server/actions/auth";

const Header = async () => {
  const user = await authUser();
  const canAccessAdmin = user?.role === "ADMIN" || user?.role === "CURATOR";

  return (
    <header
      aria-label="Main site header"
      className="from-burnt-orange via-burgundy/50 to-gold flex h-16 items-center justify-end gap-4 bg-gradient-to-br bg-repeat p-4"
      style={{
        backgroundImage: `url('/african-pattern.png')`,
        backgroundSize: "300px 300px",
      }}
    >
      <SignedOut>
        <div className="flex cursor-pointer items-center gap-3 rounded-[50%] text-sm font-medium text-white sm:text-base">
          <SignInButton>
            <button className="cursor-pointer">
              {" "}
              <LaptopMinimalCheck />
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-3">
          {canAccessAdmin && (
            <Link
              href="/admin/curate"
              className="flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Admin panel
            </Link>
          )}
          <UserButton />
        </div>
      </SignedIn>
    </header>
  );
};

export default Header;
