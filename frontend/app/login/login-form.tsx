"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth-utils";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/account/dashboard";
  const error = searchParams?.get("error");

  useEffect(() => {
    console.log("[Login] Page loaded", {
      callbackUrl,
      error,
      timestamp: new Date().toISOString(),
    });
  }, [callbackUrl, error]);

  const handleGoogleSignIn = async () => {
    console.log("[Login] Starting Google sign in", {
      callbackUrl,
      timestamp: new Date().toISOString(),
    });

    try {
      await signIn("google", {
        callbackUrl,
      });
    } catch (error) {
      console.error("[Login] Sign in error", {
        error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const errorMessage = error
    ? AUTH_ERROR_MESSAGES[error as keyof typeof AUTH_ERROR_MESSAGES] ||
      AUTH_ERROR_MESSAGES.GENERAL_ERROR
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {errorMessage && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}

        <Button variant="outline" type="button" onClick={handleGoogleSignIn}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
