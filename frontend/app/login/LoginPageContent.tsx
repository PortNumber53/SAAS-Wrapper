'use client';

import { useState } from "react";
import { signIn as nextAuthSignIn } from "next-auth/react";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    nextAuthSignIn("google", { callbackUrl: "/dashboard" })
      .catch((error) => {
        console.error("Authentication error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Signing in..." : "Sign in with Google"}
    </button>
  );
}

export default function LoginPageContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          <SignInButton />
        </div>
      </div>
    </div>
  );
}
