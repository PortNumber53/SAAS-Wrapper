import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export const runtime = 'edge'

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <div className="bg-white dark:bg-black border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
            </div>
            <Switch id="dark-mode" defaultChecked={true} />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label htmlFor="notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates and important alerts</p>
            </div>
            <Switch id="notifications" defaultChecked={true} />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Account Management</h2>
          
          <div className="space-y-4">
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
