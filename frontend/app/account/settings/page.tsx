import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const runtime = "edge";

export default async function SettingsPage() {
  const session = await auth();

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
                Toggle between light and dark themes
              </p>
            </div>
            <Switch
              id="dark-mode"
              defaultChecked={true}
              className="data-[state=checked]:bg-gnome-blue data-[state=unchecked]:bg-gnome-dark/20"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-md mb-4">
            <div>
              <Label
                htmlFor="notifications"
                className="text-gnome-dark dark:text-white"
              >
                Email Notifications
              </Label>
              <p className="text-sm text-gnome-dark/70 dark:text-white/70">
                Receive updates and important alerts
              </p>
            </div>
            <Switch
              id="notifications"
              defaultChecked={true}
              className="data-[state=checked]:bg-gnome-blue data-[state=unchecked]:bg-gnome-dark/20"
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
