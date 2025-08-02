/* eslint-disable jsx-a11y/alt-text */
"use client";

import React, { useEffect, useState } from "react";
import { useQRCode } from "next-qrcode";
import { Button } from "./ui/button";
import { Download, Share2 } from "lucide-react";

const QrGenerator = () => {
  const [link, setLink] = useState(`https://ntheo.netlify.app/#media-upload`);
  const { Image } = useQRCode();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLink(`${window.location.origin}`);
    }
  }, [link]);

  const handleDownload = () => {
    const imgParent = document.getElementById("qr-image-wanza-kiangai")!;
    const imageEl = imgParent.querySelector("img");

    if (!imageEl) {
      console.error("QR code image not available");
      return;
    }

    const imgSrc = imageEl.src;
    if (!imgSrc) {
      console.error("QR code image source not available");
      return;
    }

    const downloadlink = document.createElement("a");
    downloadlink.href = imgSrc;
    downloadlink.download = "wedding-qr-code.jpeg";
    downloadlink.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Wanza x Kiangai Photo Sharing",
          text: "Scan this QR code to share your photos from the ntheo ceremony!",
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(window.location.href);
      // TODO: Consider showing a toast notification that URL was copied
    }
  };

  return (
    <>
      <div
        className="mb-2 inline-block rounded-lg bg-white p-6"
        id="qr-image-wanza-kiangai"
        role="img"
        aria-label="QR code for sharing photos from the event"
      >
        <Image
          text={`${link}`}
          options={{
            type: "image/jpeg",
            quality: 0.3,
            margin: 2,
            width: 220,
            color: {
              dark: "#BE5103",
            },
          }}
        />
      </div>
      <p className="text-muted-foreground mb-4 text-sm">
        Scan with your phone camera to share photos
      </p>
      <div className="flex gap-3">
        <Button
          onClick={handleDownload}
          variant="burntOrange"
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button onClick={handleShare} variant="golden" className="flex-1">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>
    </>
  );
};

export default QrGenerator;
