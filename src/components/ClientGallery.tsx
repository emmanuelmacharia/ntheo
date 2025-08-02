"use client";
import React, { Suspense, useState } from "react";
import type { DB_MediaType } from "~/server/db/schema";
import { Button } from "./ui/button";
import { Grid3X3, LayoutGrid, Users2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import SharedImage from "./sharedImage";
import SharedVideo from "./sharedVideo";

const ClientGallery = (props: { media: DB_MediaType[] }) => {
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid"); // default to grid for now till we figure out sizes
  const imageTypes = "image";
  const videoTypes = "video";

  return (
    <div className="bg-background py-16">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-AlignCenter mb-12">
          <h2 className="font-Bold text-burgundy mb-4">Our Gallery</h2>
          <p className="text-muted-foreground mb-8 text-xl">
            Beautiful moments captured from every perspective
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="bg-muted flex items-center gap-3 rounded-lg p-1">
              <Button
                variant={viewMode === "masonry" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("masonry")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Masonry
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="mr-2 h-4 w-4" />
                Grid
              </Button>
            </div>
          </div>
          <div className="mb-8">
            <Card className="from-burnt-orange/10 to-gold/10 bg-gradient-to-r">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Users2 className="text-primary h-8 w-8" />
                    <div>
                      <h3 className="text-foreground text-lg font-semibold">
                        {props.media.length} Photos and Videos shared
                      </h3>
                      <p className="text-muted-foreground">
                        From our wonderful guests
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div
            className={
              viewMode === "masonry"
                ? "columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4"
                : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }
          >
            {props.media.map((media) => (
              <div className="break-inside-avoid" key={media.id}>
                <Card className="group hover:shadow-warm overflow-hidden border-0 bg-transparent shadow-none transition-all duration-300 hover:scale-105">
                  {media.type.toLowerCase().includes(imageTypes) && (
                    <SharedImage photoConfig={{ image: media, viewMode }} />
                  )}
                  {media.type.toLowerCase().includes(videoTypes) && (
                    <Suspense fallback={<p>Loading video...</p>}>
                      <SharedVideo videoConfig={{ video: media, viewMode }} />
                    </Suspense>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientGallery;
