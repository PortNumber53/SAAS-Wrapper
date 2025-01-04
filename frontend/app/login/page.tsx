export const runtime = 'edge';

import { signIn } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth-utils";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorMessage = searchParams?.error 
    ? AUTH_ERROR_MESSAGES[searchParams.error as keyof typeof AUTH_ERROR_MESSAGES] || AUTH_ERROR_MESSAGES.GENERAL_ERROR
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        
        <form 
          action={async () => {
            "use server";
            await signIn("google", { 
              redirectTo: "/dashboard"
            });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
