import React from "react";
import InviteHeader from "./inviteHeader";
import { Card, CardContent } from "~/components/ui/card";

const InviteLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <main className="from-burnt-orange to-gold relative min-h-screen overflow-hidden bg-gradient-to-br">
      <div className="absolute inset-0 opacity-30">
        <div
          className="h-full w-full bg-repeat"
          style={{
            backgroundImage: `url('/african-pattern.png')`,
            backgroundSize: "300px 300px",
          }}
        ></div>
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="z-10">
          <InviteHeader />
          <Card className="max-w-2xl min-w-[90%] bg-white/90 shadow-2xl backdrop-blur-sm lg:min-w-2xl">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
          <div className="mt-6 text-center">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="px-4 py-2">
                <h3 className="text-burgundy mb-2 font-mono text-lg font-semibold">
                  wanza & kiangai
                </h3>
                <p className="text-burnt-orange italic">
                  Your presence makes our joy complete
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default InviteLayout;
