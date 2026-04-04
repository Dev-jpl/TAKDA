import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppWrapper } from "@/components/layout/AppWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TAKDA | The Intelligent Life OS",
  description: "A professional high-fidelity coordination hub for tracking missions, identifying context intelligence, and scaling your human experience.",
  keywords: ["Life OS", "Mission Tracking", "Intelligence Registry", "Context Coordination", "Personal Administration", "High-Fidelity"],
  openGraph: {
    title: "TAKDA | The Intelligent Life OS",
    description: "Coordinate your missions with absolute technical clarity.",
    url: "https://takda.life",
    siteName: "TAKDA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TAKDA Life OS Interface",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TAKDA | The Intelligent Life OS",
    description: "High-fidelity coordination mission oversight hub.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background-primary text-text-primary antialiased selection:bg-modules-aly/30 overflow-x-hidden`}>
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  );
}
