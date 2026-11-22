import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoGo – ideme spolu",
    short_name: "CoGo",
    description: "Mestský mikro-carpooling pre Bratislavu",
    start_url: "/domov",
    display: "standalone",
    background_color: "#0E1B2C",
    theme_color: "#0E1B2C",
    lang: "sk",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
