"use client";

import { useState } from "react";

type SignInPopupProps = {
  onClose: () => void;
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void;
};

export default function SignInPopup({ onClose, currentUser, setCurrentUser }: SignInPopupProps) {
  const [step, setStep] = useState<"choose" | "signin" | "signupRole" | "signupForm">("choose");
  const [signupRole, setSignupRole] = useState<"Teacher" | "Student" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Backend fetch calls
  const handleSignIn = async () => {
    try {
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(username);
        onClose();
        setUsername("");
        setPassword("");
      } else {
        alert(data.detail || "Sign in failed");
      }
    } catch (err: any) {
      alert(err?.message || "Sign in failed");
    }
  };

  const handleSignUp = async () => {
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(username);
        onClose();
        setUsername("");
        setPassword("");
      } else {
        alert(data.detail || "Sign up failed");
      }
    } catch (err: any) {
      alert(err?.message || "Sign up failed");
    }
  };

  // Step renderers
  const renderChooseStep = () => (
    <>
      <h2 className="mb-5 font-bold text-green-500">Welcome</h2>
      <button
        onClick={() => setStep("signin")}
        className="w-full py-2 mb-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Sign In
      </button>
      <button
        onClick={() => setStep("signupRole")}
        className="w-full py-2 mb-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Sign Up
      </button>
    </>
  );

  const renderSignInForm = () => (
    <>
      <h2 className="mb-5 font-bold text-green-500">Sign In</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full py-2 px-3 mb-3 rounded-lg border-2 border-green-500 text-green-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full py-2 px-3 mb-3 rounded-lg border-2 border-green-500 text-green-500"
      />
      <button
        onClick={handleSignIn}
        className="w-full py-2 mt-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Sign In
      </button>
    </>
  );

  const renderSignupRole = () => (
    <>
      <h2 className="mb-5 font-bold text-green-500">Sign Up</h2>
      <button
        onClick={() => { setSignupRole("Teacher"); setStep("signupForm"); }}
        className="w-full py-2 mb-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Teacher
      </button>
      <button
        onClick={() => { setSignupRole("Student"); setStep("signupForm"); }}
        className="w-full py-2 mb-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Student
      </button>
    </>
  );

  const renderSignupForm = () => (
    <>
      <h2 className="mb-5 font-bold text-green-500">Sign Up</h2>
      <p className="mb-3 text-green-500">{signupRole}</p>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full py-2 px-3 mb-3 rounded-lg border-2 border-green-500 text-green-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full py-2 px-3 mb-3 rounded-lg border-2 border-green-500 text-green-500"
      />
      <button
        onClick={handleSignUp}
        className="w-full py-2 mt-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Sign Up
      </button>
    </>
  );

  const renderSignedInView = () => (
    <>
      <h2 className="mb-5 font-bold text-green-500">Signed in as {currentUser}</h2>
      <button
        onClick={() => { setCurrentUser(null); onClose(); }}
        className="w-full py-2 mt-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
      >
        Sign Out
      </button>
    </>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-xl min-w-[300px] flex flex-col items-center">
        {currentUser ? renderSignedInView() : (
          step === "choose" ? renderChooseStep() :
          step === "signin" ? renderSignInForm() :
          step === "signupRole" ? renderSignupRole() :
          renderSignupForm()
        )}

        <button
          onClick={onClose}
          className="w-full py-2 mt-3 rounded-lg border-2 border-green-500 bg-white font-bold text-green-500 hover:bg-green-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
