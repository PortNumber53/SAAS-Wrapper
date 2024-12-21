"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  HomeIcon,
  BookIcon,
  RocketIcon,
  CreditCardIcon,
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
  SettingsIcon, 
  CreditCardIcon as BillingIcon, 
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

          <div className="flex items-center space-x-4">
            <Link 
              href="/c/features" 
              className="text-muted-foreground hover:text-foreground flex items-center space-x-2"
            >
              <RocketIcon className="w-4 h-4" />
              <span>Features</span>
            </Link>
            <Link 
              href="/c/docs" 
              className="text-muted-foreground hover:text-foreground flex items-center space-x-2"
            >
              <BookIcon className="w-4 h-4" />
              <span>Docs</span>
            </Link>
            <Link 
              href="/pricing" 
              className="text-muted-foreground hover:text-foreground flex items-center space-x-2"
            >
              <CreditCardIcon className="w-4 h-4" />
              <span>Pricing</span>
            </Link>
          </div>
        </div>

        {/* Authentication and User Menu */}
        <div className="flex items-center space-x-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-muted rounded-md p-1">
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={session.user?.image || '/default-avatar.png'} 
                      alt={session.user?.name || 'User Avatar'} 
                    />
                    <AvatarFallback>
                      {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {session.user?.name?.split(' ')[0] || 'User'}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  {session.user?.name || 'My Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => router.push('/account/profile')}
                  className="cursor-pointer"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/account/settings')}
                  className="cursor-pointer"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/account/billing')}
                  className="cursor-pointer"
                >
                  <BillingIcon className="mr-2 h-4 w-4" />
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
            <Button 
              variant="outline" 
              onClick={() => router.push('/login')}
            >
              <LogInIcon className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
