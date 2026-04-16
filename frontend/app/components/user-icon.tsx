"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SignInPopup from "./signin-popup";

type UserIconProps = {
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
};

export default function UserIcon({
  currentUser,
  setCurrentUser,
  userRole,
  setUserRole,
}: UserIconProps) {
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    const savedRole = localStorage.getItem("userRole");

    if (!currentUser && savedUser) setCurrentUser(savedUser);
    if (!userRole && savedRole) setUserRole(savedRole);
  }, []);

  useEffect(() => {
    const openAuth = () => {
      setShowMenu(false);
      setShowAuthPopup(true);
    };

    window.addEventListener("open-auth", openAuth);

    return () => {
      window.removeEventListener("open-auth", openAuth);
    };
  }, []);

  const handleAccountPress = () => {
    if (currentUser) {
      setShowMenu((open) => !open);
      return;
    }

    setShowAuthPopup(true);
  };

  const signOut = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
    setCurrentUser(null);
    setUserRole(null);
    setShowMenu(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={handleAccountPress}
          className="account-trigger flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-left transition hover:bg-white"
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-full">
            <Image
              src="/user.png"
              alt="User"
              fill
              style={{ objectFit: "cover" }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {currentUser || "Account"}
            </div>
            <div className="truncate text-xs text-white/80">
              {currentUser ? `${userRole || "Student"} account` : "Sign in or create an account"}
            </div>
          </div>
        </button>

        {currentUser && (
          <button
            type="button"
            onClick={() => setShowMenu((open) => !open)}
            className="account-trigger flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 transition hover:bg-white"
            aria-label="Open account menu"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-white" />
              <span className="block h-0.5 w-5 rounded-full bg-white" />
              <span className="block h-0.5 w-5 rounded-full bg-white" />
            </span>
          </button>
        )}
      </div>

      {showAuthPopup && (
        <SignInPopup
          onClose={() => setShowAuthPopup(false)}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          setUserRole={setUserRole}
        />
      )}

      {currentUser && showMenu && !showAuthPopup && (
        <div className="account-popover absolute right-0 top-[calc(100%+0.75rem)] z-50 w-full rounded-2xl border border-sky-200 bg-white p-3 shadow-lg shadow-sky-100">
          <p className="text-sm text-white">
            Signed in as: <b>{currentUser}</b>
          </p>
          <p className="mt-1 text-sm text-white/85">
            Role: <b>{userRole || "Student"}</b>
          </p>

          <button
            className="mt-3 w-full rounded-xl border border-sky-300 bg-white py-2 font-bold text-sky-700 transition hover:bg-sky-50"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
