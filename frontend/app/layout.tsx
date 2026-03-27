"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import UserIcon from "./components/user-icon";

const navItems = [
  { href: "/", label: "Chat View" },
  { href: "/kg", label: "Knowledge Graph" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    const savedRole = localStorage.getItem("userRole");
    const savedTheme = localStorage.getItem("theme");
    if (savedUser) setCurrentUser(savedUser);
    if (savedRole) setUserRole(savedRole);
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <html lang="en">
      <body className={`min-h-screen bg-transparent text-slate-800 ${theme === "dark" ? "theme-dark" : ""}`}>
        <div className="flex min-h-screen">
          <aside className="app-sidebar flex w-72 shrink-0 flex-col border-r border-sky-200 bg-white/80 px-5 py-6 shadow-lg shadow-sky-100 backdrop-blur-sm">
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
                  Navigation
                </p>
                <h1 className="mt-2 text-2xl font-bold text-sky-950">KGTutor</h1>
                <p className="mt-2 text-sm text-sky-700/75">
                  Instructors switch between the chat experience and the knowledge graph.
                </p>
              </div>

              <nav className="space-y-3">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link block rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "nav-link-active border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-200"
                          : "border-sky-200 bg-sky-50 text-sky-900 hover:bg-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 rounded-2xl border border-sky-200 bg-white/70 p-3 shadow-sm shadow-sky-100">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
                  Theme
                </div>
                <button
                  onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                  className="theme-toggle w-full rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:bg-white"
                >
                  {theme === "light" ? "Switch To Dark Mode" : "Switch To Light Mode"}
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="app-topbar flex justify-end px-4 pt-4">
              <div className="w-full max-w-xs">
                <UserIcon
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  userRole={userRole}
                  setUserRole={setUserRole}
                />
              </div>
            </div>
            <main className="p-4 pt-3">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
