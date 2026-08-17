"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Lead Listesi", icon: "leads" },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    children: [
      { href: "/dashboard/yanit-sureleri", label: "Yanıt Süreleri" },
      { href: "/dashboard/lead-biten-satiscilar", label: "Lead Biten Personel" },
    ],
  },
  { href: "/upload", label: "Veri Yükle", icon: "upload" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="top-nav">
      <div className="container top-nav-inner">
        {/* Brand Logo */}
        <Link href="/" className="brand-logo-link" title="Ejder Turizm Lead Yönetimi">
          <div className="brand-logo-badge">
            {/* Dragon / Wing Icon SVG */}
            <svg
              className="brand-logo-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div className="brand-text-group">
            <div className="brand-title-wrap">
              <span className="brand-title-primary">EJDER</span>
              <span className="brand-title-secondary">TURİZM</span>
            </div>
            <span className="brand-tag">LEAD SİSTEMİ</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="top-nav-links">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href || Boolean(item.children?.some((child) => pathname === child.href));

            return (
              <div key={item.href} className="top-nav-item">
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={isActive ? "top-nav-link active" : "top-nav-link"}
                >
                  {item.label}
                  {item.children && (
                    <svg
                      className="top-nav-chevron"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="14"
                      height="14"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Link>
                {item.children && (
                  <div className="top-nav-submenu">
                    {item.children.map((child) => {
                      const childIsActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={childIsActive ? "page" : undefined}
                          className={childIsActive ? "top-nav-submenu-link active" : "top-nav-submenu-link"}
                        >
                          <span className="submenu-dot" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}

