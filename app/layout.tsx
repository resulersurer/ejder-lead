import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Navigation from "./navigation";

export const metadata: Metadata = {
  title: "Ejder Lead Yönetimi",
  description: "Personel bazlı lead yönetimi uygulaması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Navigation />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
