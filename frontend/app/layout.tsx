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
import { ChevronDown, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AccountDropdown } from "@/components/account-dropdown"
import { IntegrationStatusLoader } from '@/components/integration-status-loader'

const inter = Inter({
  subsets: ['latin'],
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

  const TopNavbar = () => {
    if (pathname && pathname.startsWith('/account')) {
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
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">SW</div>
              <span className="text-xl font-bold text-gray-800 pr-16">SaaS Wrapper</span>
            </Link>
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
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">SW</div>
            <span className="text-xl font-bold text-gray-800 pr-16">SaaS Wrapper</span>
          </Link>
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
          {pathname?.startsWith('/account') ? (
            <TopNavbar />
          ) : (
            <Navbar />
          )}
          <div className="flex flex-1">
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
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <IntegrationStatusLoader />
          <Toaster />
          <LayoutContent>{children}</LayoutContent>
        </SessionProvider>
      </body>
    </html>
  )
}
