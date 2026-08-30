import "~/styles/globals.css";

import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Fraunces } from "next/font/google";
import Header from "~/components/Header";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";

export const metadata: Metadata = {
  title: "Wanza <> Kiangai Ntheo/Ruracio",
  description:
    "A platform for our close friends and familiy invited to our Ntheo ceremony. We built it to provide a convenient, digital way to RSVP and access essential details about this event, as well as serve as a platform to share our memories (pictures and video) from it.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/**
 * Display face for the gallery. Geist is a fine interface font but it renders
 * headings as generic product type; the archive of a ceremony wants something
 * with warmth in it.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} ${fraunces.variable} scroll-smooth`}>
        <body>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
