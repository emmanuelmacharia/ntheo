import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { LaptopMinimalCheck } from "lucide-react";
import React from "react";

const Header = () => {
  return (
    <header
      className="from-burnt-orange via-burgund/50 to-gold flex h-16 items-center justify-end gap-4 bg-gradient-to-br bg-repeat p-4"
      style={{
        backgroundImage: `url('/african-pattern.png')`,
        backgroundSize: "300px 300px",
      }}
    >
      <SignedOut>
        <div className="bg-burgundy flex cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium text-white sm:h-12 sm:px-5 sm:text-base">
          <LaptopMinimalCheck />
          <SignInButton />
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
};

export default Header;
