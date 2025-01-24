import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
      </div>
    </div>
  </div>
);

const LoginForm = dynamic(() => import("./login-form"), {
  ssr: true,
  loading: LoadingFallback,
});

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
