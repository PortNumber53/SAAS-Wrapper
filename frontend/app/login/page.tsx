export const runtime = 'edge';

import { signIn } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorMessages: { [key: string]: string } = {
    OAuthAccountNotLinked: "This email is already associated with an account using a different sign-in method. Please contact support.",
    AccessDenied: "Authentication was denied. Please try again or contact support.",
    Configuration: "There was an issue with the authentication configuration. Please try again or contact support.",
    Default: "An unexpected authentication error occurred. Please try again."
  };

  const errorMessage = searchParams?.error 
    ? errorMessages[searchParams.error] || errorMessages.Default
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
              redirectTo: "/dashboard",
              // Add any additional parameters if needed
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
