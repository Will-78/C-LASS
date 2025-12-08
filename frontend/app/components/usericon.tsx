"use client";

import { useState } from "react";
import SignInPopup from "./SignInPopup";

export default function UserIcon() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: "#ccc",
          border: "none",
          cursor: "pointer",
        }}
        onClick={() => setShowPopup(true)}
      >
        {/* blank button for now */}
      </button>
      {showPopup && <SignInPopup onClose={() => setShowPopup(false)} />}
    </div>
  );
}
