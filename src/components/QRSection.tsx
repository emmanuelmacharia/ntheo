import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { QrCode as QrIcon } from "lucide-react";
import QrGenerator from "./QrGenerator";

const QRSection = () => {
  return (
    <div className="bg-pink/4 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="text-foreground mb-4 text-3xl font-semibold">
            Quick Photo and Media Sharing
          </div>
          <div className="text-muted-foreground mx-auto max-w-3xl text-lg">
            <p>
              Share this QR code widely across the venue for everyone to share
              their moments
            </p>
          </div>
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h3 className="text-foreground mb-6 py-4 text-2xl font-semibold">
                How it works
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-start justify-start md:items-center md:justify-center">
                    <div>
                      <h4 className="text-foreground mb-2 font-semibold">
                        Place QR Codes
                      </h4>
                      <p className="text-muted-foreground">
                        Download and print the QR code. Place them on tables,
                        near the altar, and other key locations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div>
                      <h4 className="text-foreground mb-2 font-semibold">
                        Guests Scan
                      </h4>
                      <p className="text-muted-foreground">
                        Guests scan with their phone camera to instantly access
                        the photo upload page.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div>
                      <h4 className="text-foreground mb-2 font-semibold">
                        Share Instantly
                      </h4>
                      <p className="text-muted-foreground">
                        Photos are instantly shared with you, creating a
                        beautiful collection from all perspectives.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center py-8">
              <Card className="shadow-warm w-fit border-2">
                <CardHeader className="-pb-4 text-center">
                  <CardTitle className="text-foreground flex items-center justify-center gap-3">
                    <QrIcon className="text-primary h-6 w-6" />
                    Ntheo Photo Share
                  </CardTitle>
                </CardHeader>
                <CardContent className="-pt-8 -mt-8 text-center">
                  <div className="mb-6 inline-block rounded-lg bg-white p-6">
                    <QrGenerator />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRSection;
