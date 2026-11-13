import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "App Store Screenshots",
  description: "Design and export App Store + Google Play screenshots.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same Fraunces cut as the website (web/src/layouts/Base.astro), so exports
            embed the @font-face html-to-image finds in document.styleSheets. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Fraunces:opsz,wght,SOFT@9..144,600,100&display=swap"
        />
      </head>
      <body className={font.className}>{children}</body>
    </html>
  );
}
