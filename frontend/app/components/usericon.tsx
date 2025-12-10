"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SignInPopup from "./SignInPopup";

export default function UserIcon() {
  const [showPopup, setShowPopup] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("username");
    if (saved) setUsername(saved);
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

      {showPopup && (
        <SignInPopup
          onClose={() => setShowPopup(false)}
          currentUser={username}
          setCurrentUser={(user) => {
            setUsername(user);
            if (user) {
              localStorage.setItem("username", user);
            } else {
              localStorage.removeItem("username");
            }
          }}
        />
      )}

      {username && !showPopup && (
        <div className="absolute top-10 right-0 bg-white p-3 rounded-lg border border-gray-300">
          <p>
            Signed in as: <b>{username}</b>
          </p>
          <button
            className="mt-2 text-green-500 font-bold hover:underline"
            onClick={() => {
              localStorage.removeItem("username");
              setUsername(null);
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
