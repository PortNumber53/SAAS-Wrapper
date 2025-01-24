"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePageTitle } from "@/lib/page-title-context";
import { Settings } from "lucide-react";

export const runtime = "edge";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    setPageTitle("Account Settings", Settings);
  }, [setPageTitle]);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="gnome-header">Account Settings</h1>

      <div className="gnome-card space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gnome-dark dark:text-white">
            Preferences
          </h2>

          <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-md mb-4">
            <div>
              <Label
                htmlFor="dark-mode"
                className="text-gnome-dark dark:text-white"
              >
                Dark Mode
              </Label>
              <p className="text-sm text-gnome-dark/70 dark:text-white/70">
                Enable dark mode for a better viewing experience at night
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-md mb-4">
            <div>
              <Label
                htmlFor="email-notifications"
                className="text-gnome-dark dark:text-white"
              >
                Email Notifications
              </Label>
              <p className="text-sm text-gnome-dark/70 dark:text-white/70">
                Receive email notifications about your account activity
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-gnome-dark dark:text-white">
            Account Management
          </h2>

          <div className="space-y-4">
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
