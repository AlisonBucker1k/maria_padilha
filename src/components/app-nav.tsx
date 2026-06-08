"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DatabaseIcon, FolderIcon } from "@/components/ui/icons";

const links = [
  { href: "/", label: "CPF/CNPJ", Icon: DatabaseIcon },
  { href: "/storage", label: "Storage Syllos", Icon: FolderIcon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3 sm:px-6 lg:px-8">
        <span className="mr-4 flex items-center gap-2 self-center text-sm font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">
            M
          </span>
          Painel Maria
        </span>
        {links.map(({ href, label, Icon }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon width={16} height={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
