"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  BanknotesIcon,
  Bars3Icon,
  BriefcaseIcon,
  ChartBarIcon,
  DocumentTextIcon,
  HomeIcon,
  RectangleStackIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { Section } from "@/lib/permissions";
import { sectionsForRole } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const navigation: {
  name: string;
  href: string;
  section: Section | null;
  icon: typeof HomeIcon;
}[] = [
  { name: "Обзор", href: "/", section: null, icon: HomeIcon },
  { name: "Продажи", href: "/sales", section: "sales", icon: ChartBarIcon },
  { name: "Финансы", href: "/finance", section: "finance", icon: BanknotesIcon },
  { name: "Бухгалтерия", href: "/accounting", section: "accounting", icon: RectangleStackIcon },
  { name: "Проекты", href: "/projects", section: "projects", icon: BriefcaseIcon },
  { name: "Документы", href: "/documents", section: "documents", icon: DocumentTextIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const allowed = new Set(sectionsForRole(session.user.role as Role));
  const items = navigation.filter((n) => n.section === null || allowed.has(n.section));

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <ul className={classNames("space-y-1", mobile ? "px-2" : "")}>
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={classNames(
                "group flex gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              {item.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Dialog open={mobileOpen} onClose={setMobileOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setMobileOpen(false)}
              >
                <span className="sr-only">Закрыть меню</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 py-6 dark:bg-slate-900">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">ProBrand ERP</p>
              <NavLinks mobile />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">ProBrand ERP</p>
          <NavLinks />
        </div>
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:gap-x-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 lg:hidden dark:text-slate-200"
            onClick={() => setMobileOpen(true)}
          >
            <span className="sr-only">Открыть меню</span>
            <Bars3Icon className="h-6 w-6" aria-hidden />
          </button>
          <div className="flex flex-1 items-center justify-between gap-x-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {session.user.organizationId ? "Организация подключена" : ""}
            </p>
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800">
                <span className="max-w-[10rem] truncate">{session.user.name ?? session.user.email}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {session.user.role}
                </span>
              </MenuButton>
              <MenuItems className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg focus:outline-none dark:border-slate-700 dark:bg-slate-900">
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      className={classNames(
                        "block w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200",
                        focus ? "bg-slate-50 dark:bg-slate-800" : "",
                      )}
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      Выйти
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
