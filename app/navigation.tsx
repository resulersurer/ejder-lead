"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Lead Listesi" },
  {
    href: "/dashboard",
    label: "Dashboard",
    children: [
      { href: "/dashboard/yanit-sureleri", label: "Yanıt Süreleri" },
      { href: "/dashboard/lead-biten-satiscilar", label: "Lead Biten Satışçılar" },
    ],
  },
  { href: "/upload", label: "Veri Yükle" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <div className="container top-nav-inner">
        <div>
          <strong className="top-nav-title">
            <span className="top-nav-mark">E</span>
            Ejder Lead
          </strong>
        </div>
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
    </nav>
  );
}
