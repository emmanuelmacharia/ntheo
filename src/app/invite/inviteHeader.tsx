import { Heart } from "lucide-react";
import React from "react";

const InviteHeader = () => {
  return (
    <div className="mb-4 text-center">
      <div className="bg-gold shadow-gold mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <Heart className="text-burnt-orange h-8 w-8" fill="currentColor" />
      </div>
      <h1 className="text-primary-foreground mb-2 text-4xl font-bold">
        E{"<>"}M
      </h1>
      <p className="text-primary-foreground/80">Ntheo Ceremony</p>
    </div>
  );
};

export default InviteHeader;
