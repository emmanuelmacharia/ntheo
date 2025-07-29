import "~/styles/globals.css";

import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import Header from "~/components/Header";

export const metadata: Metadata = {
  title: "Wanza x Kiangai Ntheo/Ruracio",
  description:
    "A platform for our close friends and familiy invited to our Ntheo ceremony.We built it to provide a convenient, digital way to RSVP and access essential details about this event, and serve as a platform to share our memories (pictures and video) from it.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable}`}>
        <body>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
