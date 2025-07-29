import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { LaptopMinimalCheck } from "lucide-react";
import React from "react";

const Header = () => {
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
        <UserButton />
      </SignedIn>
    </header>
  );
};

export default Header;
