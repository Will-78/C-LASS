"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SignInPopup from "./SignInPopup";

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
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    const savedRole = localStorage.getItem("userRole");

    if (!currentUser && savedUser) setCurrentUser(savedUser);
    if (!userRole && savedRole) setUserRole(savedRole);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopup(true)}
        className="w-8 h-8 rounded-full overflow-hidden border-none cursor-pointer relative"
      >
        <Image
          src="/user.png"
          alt="User"
          fill
          style={{ objectFit: "cover" }}
        />
      </button>

    {/* show pop up only if showPopUp is true (logical AND)*/}
      {showPopup && (
        <SignInPopup
          onClose={() => setShowPopup(false)}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          setUserRole={setUserRole}
        />
      )}

    {/* show signed-in info only if there exists a current user and the popup is not open*/}
      {currentUser && !showPopup && (
        <div className="absolute top-10 right-0 bg-white p-3 rounded-lg border border-gray-300 w-48 z-50">
          <p>
            Signed in as: <b>{currentUser}</b>
          </p>
          <p className="text-sm text-gray-600">
            Role: <b>{userRole || "Student"}</b>
          </p>

          <button
            className="mt-2 w-full py-1 bg-green-100 text-green-700 rounded font-bold hover:bg-green-200"
            onClick={() => {
              // clear localStorage and state
              localStorage.removeItem("username");
              localStorage.removeItem("userRole");
              setCurrentUser(null);
              setUserRole(null);
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
