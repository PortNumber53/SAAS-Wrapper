"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { 
  HomeIcon, 
  SettingsIcon, 
  LogInIcon, 
  LogOutIcon 
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()

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
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/api/auth/signout"
                className="inline-flex items-center"
              >
                <Button variant="destructive" size="sm">
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </Link>
            </div>
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
