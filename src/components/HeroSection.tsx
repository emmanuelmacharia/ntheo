"use cleint";
import { Camera, Heart, QrCode } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{ backgroundImage: `url(/wedding-hero.jpg)` }}
      >
        <div className="from-primary/80 via-african-terracotta/70 to-african-gold/60 absolute inset-0 bg-gradient-to-r" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8">
          <Heart
            className="text-gold mx-auto mb-6 h-16 w-16"
            fill="currentColor"
          ></Heart>
          <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
            Celebrate
            <span className="text-gold block">Together</span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/70 md:text-2xl">
            Join us for a day filled with love, laughter, and unforgettable
            memories <br /> Every photo tells our story from a different
            perspective.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
          {/* TODO: ADD ACTION ON THESE BUTTONS */}
          <Button variant="burntOrange" size="lg" className="px-8 py-6 text-lg">
            <Link
              href="#media-upload"
              className="flex items-center"
              scroll={true}
            >
              <Camera className="mr-3 h-6 w-6" />
              Share your photos
            </Link>
          </Button>
          <Button variant="golden" size="lg" className="px-8 py-6 text-lg">
            <Link
              href="#qr-section"
              className="flex items-center"
              scroll={true}
            >
              <QrCode className="mr-3 h-6 w-6" />
              Scan QR code
            </Link>
          </Button>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <Camera className="text-gold mx-auto mb-4 h-12 w-12" />
            <h3 className="text-primary-foreground mb-2 text-xl font-semibold">
              Capture
            </h3>
            <p className="text-primary-foreground/80">
              Take photos of special moments during the ceremony
            </p>
          </div>
          <div className="text-center">
            <QrCode className="text-gold mx-auto mb-4 h-12 w-12" />
            <h3 className="text-primary-foreground mb-2 text-xl font-semibold">
              Share
            </h3>
            <p className="text-primary-foreground/80">
              Scan the QR code to upload your photos instantly
            </p>
          </div>
          <div className="text-center">
            <Heart
              className="text-gold mx-auto mb-4 h-12 w-12"
              fill="currentColor"
            />
            <h3 className="text-primary-foreground mb-2 text-xl font-semibold">
              Celebrate
            </h3>
            <p className="text-primary-foreground/80">
              Create beautiful memories together as one community
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
