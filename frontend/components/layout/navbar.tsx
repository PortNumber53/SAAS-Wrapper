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
  LogOutIcon,
  ShoppingCartIcon
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
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
  LogOutIcon as LogOutIcon2,
  ChevronDown,
  User,
  Settings,
  CreditCard,
  ShoppingCart,
  List,
  LogOut
} from "lucide-react"
import { useEffect } from "react"
import { handleLogout } from "@/lib/auth-utils"

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // Check if the current path is within the account section
  const isAccountPage = pathname && pathname.startsWith('/account/')

  useEffect(() => {
    const handleResize = () => {
      const bodyWidth = document.body.clientWidth;
      const htmlWidth = document.documentElement.clientWidth;
      console.log('Body width:', bodyWidth);
      console.log('HTML width:', htmlWidth);
      console.log('Scrollbar width:', htmlWidth - bodyWidth);
    };

    const checkOverflow = () => {
      const body = document.body;
      const html = document.documentElement;

      console.log('Body overflow-x:', getComputedStyle(body).overflowX);
      console.log('HTML overflow-x:', getComputedStyle(html).overflowX);

      console.log('Body scrollWidth:', body.scrollWidth);
      console.log('Body clientWidth:', body.clientWidth);
      console.log('HTML scrollWidth:', html.scrollWidth);
      console.log('HTML clientWidth:', html.clientWidth);
    };

    handleResize();
    checkOverflow();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {!isAccountPage && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-screen-xl">
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
            <div className="flex items-center space-x-4 min-h-[40px]">
              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-2 rounded">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                        {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span>{session.user?.name || 'User'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 bg-white border rounded shadow-lg"
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 font-semibold text-gray-600 border-b">My Account</div>

                      <DropdownMenuItem
                        onSelect={() => router.push('/account/profile')}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => router.push('/account/settings')}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => router.push('/account/billing')}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Billing</span>
                      </DropdownMenuItem>

                      <div className="border-t my-1"></div>
                      <div className="px-4 py-2 font-semibold text-gray-600 border-b">Workspaces</div>

                      <DropdownMenuItem
                        onSelect={() => router.push('/account/ecommerce')}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>E-commerce</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer opacity-50 cursor-not-allowed"
                      >
                        <List className="h-4 w-4" />
                        <span>SaaS (Coming Soon)</span>
                      </DropdownMenuItem>

                      <div className="border-t my-1"></div>
                      <DropdownMenuItem
                        onSelect={() => handleLogout('/login')}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer text-red-500"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="w-[180px] min-h-[40px] flex items-center">
                  <Link href="/login" className="text-sm font-medium">
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  )
}
