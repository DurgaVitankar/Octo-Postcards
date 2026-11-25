import type { Metadata } from "next";
import "./globals.css";

const description = "Write a postcard to someone you miss, and send it to their inbox.";

// The preview image, tab icon and Apple touch icon come from the files next to
// this layout (opengraph-image.png, icon.png, apple-icon.png).
export const metadata: Metadata = {
  metadataBase: new URL("https://octo-postcards.vercel.app"),
  title: "Postcards",
  description,
  openGraph: {
    title: "Postcards, with love",
    description,
    siteName: "Postcards",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Postcards, with love",
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
