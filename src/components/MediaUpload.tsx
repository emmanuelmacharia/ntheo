import React from "react";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { ImageIcon } from "lucide-react";
import Upload from "./Upload";
import { UploadV2 } from "./Uploadv2";

const MediaUpload = () => {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-4 text-4xl font-bold">
            Share Your Photos
          </h2>
          <p className="text-muted-foreground text-xl">
            Help us capture every beautiful moment from all perspectives
          </p>
        </div>
        <Card className="border-border hover:border-burnt-orange border-2 border-dashed transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-3 text-lg">
              <ImageIcon className="text-burnt-orange h-6 w-6" />
              Upload Ntheo Photos
            </CardTitle>
            <div className="hover:bg-muted/50 cursor-pointer rounded-lg text-center transition-colors md:p-8">
              {/* <Upload /> */}
              <UploadV2 />
            </div>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
};

export default MediaUpload;
