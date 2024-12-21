"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  HomeIcon,
  SettingsIcon,
  LogInIcon,
  LogOutIcon
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  UserIcon, 
  SettingsIcon as SettingsIcon2, 
  CreditCardIcon, 
  LogOutIcon as LogOutIcon2 
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: '/'
    });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo and Navigation Links */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-foreground hover:text-primary"
          >
            <HomeIcon className="w-5 h-5" />
            <span className="font-semibold">SaaS Wrapper</span>
          </Link>

          <div className="flex space-x-4">
            <Link
              href="/features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
          </div>
        </div>

        {/* Authentication Button */}
        <div>
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarImage 
                      src={session.user?.image || undefined} 
                      alt={session.user?.name || "User Avatar"} 
                    />
                    <AvatarFallback>
                      {session.user?.name ? 
                        session.user.name.charAt(0).toUpperCase() : 
                        "U"
                      }
                    </AvatarFallback>
                  </Avatar>
                  {session.user?.name || "Account"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => router.push("/profile")}
                  className="cursor-pointer"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push("/settings")}
                  className="cursor-pointer"
                >
                  <SettingsIcon2 className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push("/billing")}
                  className="cursor-pointer"
                >
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOutIcon2 className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">
                <LogInIcon className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
