import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sayfa Kullanılamıyor | Ejder Turizm",
  description: "Bu uygulamaya erişim kapatılmıştır.",
  robots: { index: false, follow: false },
};

export default function UnavailablePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="unavailable-title">
        <p className={styles.brand}>EJDER TURİZM <span>LEAD SİSTEMİ</span></p>
        <div className={styles.icon} aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="10" width="14" height="11" rx="3" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
          </svg>
        </div>
        <h1 id="unavailable-title">Bu sayfa kullanılamamaktadır.</h1>
        <p className={styles.description}>Uygulamaya erişim kapatılmıştır.<br />Bilgi almak için lütfen yöneticinizle iletişime geçin.</p>
        <span className={styles.status}>Erişim kapalı</span>
      </section>
    </main>
  );
}
