"use client"

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from "@/components/layout/navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { auth } from "@/app/auth"
import { Toaster, ToastProvider } from "@/components/ui/use-toast"
import './globals.css'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SessionProvider, useSession } from 'next-auth/react'
import { cn } from "@/lib/utils"
import Image from 'next/image'
import {
  ShoppingCart,
  User,
  Settings,
  CreditCard
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

function LayoutContent({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const AccountDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-2 rounded">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span>{session?.user?.name || 'User'}</span>
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
            <Settings className="h-4 w-4" />
            <span>SaaS (Coming Soon)</span>
          </DropdownMenuItem>

          <div className="border-t my-1"></div>
          <DropdownMenuItem
            onSelect={() => signOut({ redirect: true, redirectTo: '/login' })}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer text-red-500"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const TopNavbar = () => {
    if (pathname.startsWith('/account')) {
      let managementTitle = 'Profile Management';
      let managementIcon = <User className="h-5 w-5" />;

      if (pathname.includes('/ecommerce')) {
        managementTitle = 'E-commerce Management';
        managementIcon = <ShoppingCart className="h-5 w-5" />;
      } else if (pathname.includes('/settings')) {
        managementTitle = 'Settings Management';
        managementIcon = <Settings className="h-5 w-5" />;
      } else if (pathname.includes('/billing')) {
        managementTitle = 'Billing Management';
        managementIcon = <CreditCard className="h-5 w-5" />;
      }

      return (
        <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">SW</div>
            <span className="text-xl font-bold text-gray-800 pr-16">SaaS Wrapper</span>
            <div className="ml-6 flex items-center space-x-2">
              {managementIcon}
              <span>{managementTitle}</span>
            </div>
          </div>
          <AccountDropdown />
        </div>
      )
    }

    return (
      <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">SW</div>
          <span className="text-xl font-bold text-gray-800 pr-4">SaaS Wrapper</span>
          <nav className="ml-6 flex space-x-4">
            <Link href="#features" className="text-sm font-medium text-gray-700 hover:text-gray-900">Features</Link>
            <Link href="#docs" className="text-sm font-medium text-gray-700 hover:text-gray-900">Docs</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-700 hover:text-gray-900">Pricing</Link>
          </nav>
        </div>
        <AccountDropdown />
      </div>
    )
  }

  return (
    <div className={cn(
      inter.className,
      'font-sans antialiased flex flex-col min-h-screen'
    )}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <ToastProvider>
          <TopNavbar />
          <div className="flex flex-1">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ToastProvider>
      </ThemeProvider>
    </div>
  )
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <LayoutContent>{children}</LayoutContent>
        </SessionProvider>
      </body>
    </html>
  )
}
