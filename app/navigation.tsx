"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Lead Listesi" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Veri Yükle" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <div className="container top-nav-inner">
        <div>
          <strong className="top-nav-title">Ejder Lead</strong>
        </div>
        <div className="top-nav-links">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "top-nav-link active" : "top-nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
