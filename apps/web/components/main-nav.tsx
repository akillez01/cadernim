"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type Role = "ADMIN" | "STUDENT" | null;

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ava", label: "AVA" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/booklets", label: "PDF" },
  { href: "/hymns/new", label: "Cadastrar Hino", adminOnly: true },
  { href: "/history", label: "Historico" }
];

export function MainNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.adminOnly || role === "ADMIN");

  return (
    <nav className="-mx-1 flex w-full items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0">
      {visibleItems.map((item) => {
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              active
                ? "bg-moss-700 text-white shadow-sm"
                : "border border-moss-200/80 bg-white/70 text-moss-700 hover:bg-moss-100/80"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
