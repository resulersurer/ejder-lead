import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ejder Lead Yönetimi",
  description: "Personel bazlı lead yönetimi uygulaması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
