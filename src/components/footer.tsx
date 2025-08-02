import { Heart, Camera, Users, QrCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="from-burnt-orange to-gold relative overflow-hidden bg-gradient-to-r">
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full bg-repeat"
          style={{
            backgroundImage: `url('/african-pattern.png')`,
            backgroundSize: "150px 150px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Heart className="text-gold mr-3 h-8 w-8" fill="currentColor" />
            <h3 className="text-primary-foreground text-2xl font-bold">
              Wanza {"<>"} Kiangai
            </h3>
          </div>
          <p className="text-primary-foreground/80 mx-auto max-w-2xl text-lg">
            Thank you for being part of our special day and sharing your
            beautiful perspectives with us. Every photo tells our story from a
            unique angle.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <Camera className="text-gold mx-auto mb-3 h-8 w-8" />
            <h4 className="text-primary-foreground mb-2 text-lg font-semibold">
              Capture Moments
            </h4>
            <p className="text-primary-foreground/70 text-sm">
              Every snapshot preserves the joy and beauty of our celebration
            </p>
          </div>
          <div className="text-center">
            <QrCode className="text-gold mx-auto mb-3 h-8 w-8" />
            <h4 className="text-primary-foreground mb-2 text-lg font-semibold">
              Share Instantly
            </h4>
            <p className="text-primary-foreground/70 text-sm">
              QR codes make sharing effortless for all our guests
            </p>
          </div>
          <div className="text-center">
            <Users className="text-gold mx-auto mb-3 h-8 w-8" />
            <h4 className="text-primary-foreground mb-2 text-lg font-semibold">
              Community Spirit
            </h4>
            <p className="text-primary-foreground/70 text-sm">
              Together we create a complete picture of our celebration
            </p>
          </div>
        </div>

        <div className="border-primary-foreground/20 border-t pt-8 text-center">
          <p className="text-primary-foreground/60 text-sm">
            Built with love for our ntheo/ruracio. Catch you later!
          </p>
        </div>
      </div>
    </footer>
  );
}
