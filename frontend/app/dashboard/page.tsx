"use client"

import { auth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export const runtime = 'edge';

export default function DashboardPage() {
  const { data: session } = useSession();

  // If no session, redirect to login
  useEffect(() => {
    if (!session) {
      redirect("/login");
    }
  }, [session]);

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      redirectTo: '/'
    });
  }

  // If session is not yet loaded, show a loading state
  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p>Welcome, {session.user?.name || 'User'}!</p>
        <p>Email: {session.user?.email}</p>
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="mt-4"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
