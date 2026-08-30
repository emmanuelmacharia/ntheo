/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "u9jm41a12w.ufs.sh",
        port: "",
        pathname: "/**",
      },
    ],
    /**
     * The gallery puts dozens of images on screen at once, and the originals are
     * 2 to 7MB each. The optimizer downloads the full original once per
     * rendition, so the defaults ask it to pull hundreds of megabytes to paint
     * one screen, and some of those upstream fetches time out and return 500.
     *
     * Dropping the 2048 and 3840 buckets removes the most expensive renditions
     * nobody here needs: the largest thing on the page is a full-bleed hero, and
     * 1920 covers that. The long cache TTL means each rendition is fetched from
     * the CDN once rather than on every request.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 2_592_000, // 30 days
    formats: ["image/webp"],
  },
};

export default config;
