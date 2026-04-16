"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";

type SignInPopupProps = {
  onClose: () => void;
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void;
  setUserRole: (role: string | null) => void;
};

export default function SignInPopup({
  onClose,
  currentUser,
  setCurrentUser,
  setUserRole,
}: SignInPopupProps) {
  const [step, setStep] = useState<"choose" | "signin" | "signupRole" | "signupForm">("choose");
  const [signupRole, setSignupRole] = useState<"Teacher" | "Student" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
        setUserRole(data.role || "Student");
        localStorage.setItem("username", username);
        localStorage.setItem("userRole", data.role || "Student");
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
        body: JSON.stringify({ username, password, role: signupRole }),
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser(username);
        setUserRole(signupRole || "Student");
        localStorage.setItem("username", username);
        localStorage.setItem("userRole", signupRole || "Student");
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

  const shell = (title: string, subtitle: string, content: ReactNode) => (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-white/85">{subtitle}</p>
      </div>
      <div className="w-full">{content}</div>
    </>
  );

  const actionButton =
    "w-full rounded-xl border border-sky-200 bg-white py-3 font-semibold text-sky-500 shadow-sm transition hover:bg-sky-100 hover:shadow-md";

  const fieldClass =
    "w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sky-500 placeholder:text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent";

  const primaryButton =
    "w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg";

  const renderChooseStep = () =>
    shell(
      "Welcome",
      "Access your account or create one.",
      <div className="space-y-3">
        <button onClick={() => setStep("signin")} className={actionButton}>
          Sign In
        </button>
        <button onClick={() => setStep("signupRole")} className={actionButton}>
          Sign Up
        </button>
      </div>
    );

  const renderSignInForm = () =>
    shell(
      "Sign In",
      "Use your existing account credentials.",
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={fieldClass}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        <button onClick={handleSignIn} className={primaryButton}>
          Sign In
        </button>
      </div>
    );

  const renderSignupRole = () =>
    shell(
      "Sign Up",
      "Choose the role for the account you want to create.",
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setSignupRole("Teacher");
            setStep("signupForm");
          }}
          className={actionButton}
        >
          Teacher
        </button>
        <button
          onClick={() => {
            setSignupRole("Student");
            setStep("signupForm");
          }}
          className={actionButton}
        >
          Student
        </button>
      </div>
    );

  const renderSignupForm = () =>
    shell(
      "Create Account",
      `Creating a ${signupRole || "Student"} account.`,
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={fieldClass}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        <button onClick={handleSignUp} className={primaryButton}>
          Sign Up
        </button>
      </div>
    );

  const renderSignedInView = () =>
    shell(
      "Account",
      `You are signed in as ${currentUser}.`,
      <button
        onClick={() => {
          localStorage.removeItem("username");
          localStorage.removeItem("userRole");
          setCurrentUser(null);
          setUserRole(null);
          onClose();
        }}
        className={actionButton}
      >
        Sign Out
      </button>
    );

  return (
    <div className="auth-overlay fixed inset-0 z-[10000] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(224,242,254,0.96)_36%,_rgba(186,230,253,0.88)_100%)] backdrop-blur-sm">
      <div className="grid min-h-screen md:grid-cols-[1.05fr_1fr]">
        <div className="auth-side flex flex-col justify-between border-r border-sky-200/80 bg-[linear-gradient(180deg,_rgba(14,165,233,0.12),_rgba(224,242,254,0.32))] px-10 py-12 md:px-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">
              KGTutor
            </p>
            <h3 className="mt-4 max-w-md text-4xl font-bold text-slate-500">
              Sign in or create your account
            </h3>
            <p className="mt-5 max-w-lg text-base leading-7 text-white">
              An AI-powered learning experience built to guide you through complex cybersecurity concepts.
            </p>
            <div className="mt-6">
              <Image
                src="/logo.png"
                alt="KGTutor logo"
                width={1060}
                height={1060}
                className="h-auto w-[32rem] max-w-none object-contain md:w-[52rem]"
                priority
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-sky-200 bg-white/70 p-5 text-sm text-sky-900 shadow-sm shadow-sky-100">
              Understand. Analyze. Secure.
            </div>
            <div className="rounded-3xl border border-sky-200 bg-white/70 p-5 text-sm text-sky-900 shadow-sm shadow-sky-100">
              Get guided help, understand the concepts, and actually learn as you go.
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-6 py-8 sm:px-10 md:px-14">
          <div className="auth-card w-full max-w-xl rounded-[2rem] border border-sky-200 bg-white/80 p-8 shadow-2xl shadow-sky-200/70 backdrop-blur-md sm:p-10">
            <div className="w-full">
              {currentUser
                ? renderSignedInView()
                : step === "choose"
                ? renderChooseStep()
                : step === "signin"
                ? renderSignInForm()
                : step === "signupRole"
                ? renderSignupRole()
                : renderSignupForm()}
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl border border-sky-300 bg-white py-3 font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
