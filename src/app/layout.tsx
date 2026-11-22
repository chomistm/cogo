import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoGo",
  description: "Mestský mikro-carpooling pre Bratislavu. Virtuálne zastávky, CoGo kredity, garancia návratu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CoGo", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0E1B2C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="font-sans antialiased">
        <div className="app-frame">{children}</div>
      </body>
    </html>
  );
}
