"use client";

import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Ticket,
  UserCircle2,
  UserRoundCog,
  X,
} from "lucide-react";
import {
  AUTH_CHANGE_EVENT,
  ApiError,
  apiFetch,
  clearStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredUser,
} from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { User } from "@/types/domain";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/tickets/new", label: "New ticket", icon: PlusCircle },
  { href: "/admin/users", label: "Users", icon: UserRoundCog, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const visibleNavItems = useMemo(
    () =>
      navItems.filter(
        (item) => !item.adminOnly || sessionUser?.role === "ADMIN",
      ),
    [sessionUser],
  );

  useEffect(() => {
    let ignore = false;

    async function validateSession() {
      const token = getStoredToken();
      const cachedUser = getStoredUser();

      setSessionError(null);

      if (cachedUser) {
        setSessionUser(cachedUser);
      }

      try {
        const user = await apiFetch<User>("/auth/me");

        if (!ignore) {
          setStoredUser(user);
          setSessionUser(user);
          setCheckingSession(false);
        }
      } catch (err) {
        if (ignore) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          clearStoredToken();
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setSessionError(
          err instanceof Error ? err.message : "Could not validate session",
        );
        setCheckingSession(false);
      }
    }

    void validateSession();

    function syncSessionFromStorage() {
      setSessionUser(getStoredUser());
    }

    window.addEventListener(AUTH_CHANGE_EVENT, syncSessionFromStorage);
    window.addEventListener("storage", syncSessionFromStorage);

    return () => {
      ignore = true;
      window.removeEventListener(AUTH_CHANGE_EVENT, syncSessionFromStorage);
      window.removeEventListener("storage", syncSessionFromStorage);
    };
  }, [pathname, router]);

  function handleLogout() {
    clearStoredToken();
    setOpen(false);
    router.replace("/login");
  }

  if (checkingSession && !sessionUser) {
    return (
      <div className="min-h-screen bg-gray-2 p-4 md:p-6">
        <LoadingState label="Checking session" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-gray-2 p-4 md:p-6">
        <ErrorState
          message={sessionError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 text-dark">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between px-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
                <BarChart3 size={22} strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-lg font-bold leading-5">
                  SupportFlow
                </span>
                <span className="block text-xs font-medium text-gray-500">
                  Ticket operations
                </span>
              </span>
            </Link>
            <button
              type="button"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-4">
            {visibleNavItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-dark"
            >
              <LogOut size={20} />
              Log out
            </button>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      ) : null}

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-sm font-semibold text-gray-500 lg:block">
            Internal support workspace
          </div>
          <div className="flex items-center gap-3">
            {sessionUser ? (
              <div className="hidden items-center gap-2 text-right sm:flex">
                <UserCircle2 size={22} className="text-gray-500" />
                <div>
                  <div className="text-sm font-semibold text-dark">
                    {sessionUser.name}
                  </div>
                  <div className="text-xs font-medium text-gray-500">
                    {sessionUser.role}
                  </div>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
