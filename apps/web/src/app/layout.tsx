import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFrame } from "./components/editorial";
import "./globals.css";
import { siteMetadata } from "./site-content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: siteMetadata.title,
    template: `%s · ${siteMetadata.shortTitle}`,
  },
  description: siteMetadata.description,
  applicationName: siteMetadata.shortTitle,
  openGraph: {
    type: "website",
    siteName: siteMetadata.shortTitle,
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
