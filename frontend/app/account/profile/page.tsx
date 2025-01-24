"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { User } from "lucide-react";

export const runtime = "edge";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle("Profile", User);
  }, [setPageTitle]);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="bg-white dark:bg-black border rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-6">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User Avatar"}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{session.user?.name}</h2>
            <p className="text-muted-foreground">{session.user?.email}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">Account Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p>{session.user?.name || "Not provided"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p>{session.user?.email || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
