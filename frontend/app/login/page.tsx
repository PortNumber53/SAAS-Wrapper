"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn("google", { 
        redirect: false, 
        callbackUrl: "/" 
      });

      if (result?.error) {
        setError(result.error);
        console.error("Sign in error:", result.error);
      } else if (result?.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Unexpected sign in error:", err);
      setError(String(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-muted rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-center">Login to SAAS Wrapper</h2>
        <div className="space-y-4">
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full"
            variant="outline"
          >
            Sign in with Google
          </Button>
          
          {error && (
            <div className="text-destructive text-sm text-center mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
