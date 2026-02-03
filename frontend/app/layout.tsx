"use client";

import "./globals.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import UserIcon from "./components/UserIcon";
import { execSync } from "node:child_process";
import { exportTraceState } from "next/dist/trace";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    const savedRole = localStorage.getItem("userRole");
    if (savedUser) setCurrentUser(savedUser);
    if (savedRole) setUserRole(savedRole);
  }, []); // empty array ensures useEffect stuff only runs once

  return (
    <html lang="en">
      <body>
        <header className="relative flex items-center p-4 bg-gray-100 border-b border-gray-300">
          
          {/* Centered Navigation */}
          <nav className="absolute left-1/2 transform -translate-x-1/2 flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
            >
              Chat View
            </Link>

            {/* Knowledge Graph only visible to Teachers */}
            {userRole === "Teacher" && (
              <Link
                href="/kg"
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
              >
                Knowledge Graph
              </Link>
            )}
          </nav>

          {/* User Icon / SignIn stays on right */}
          <div className="ml-auto">
            <UserIcon
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              userRole={userRole}
              setUserRole={setUserRole}
            />
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
