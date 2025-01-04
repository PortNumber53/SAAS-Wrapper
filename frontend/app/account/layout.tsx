"use client"

import { useState, useEffect } from 'react'
import {
  ShoppingCart,
  Package,
  List,
  User,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  UserIcon,
  SettingsIcon,
  CreditCardIcon as BillingIcon,
  LogOutIcon as LogOutIcon2,
  ShoppingCartIcon
} from "lucide-react"
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

type Section = 'E-commerce' | 'Products' | 'Orders' | 'Sales' | 'Profile' | 'Settings' | 'Billing'

export default function AccountLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()

  const getSectionFromPath = (path: string | null): Section => {
    if (!path) return 'E-commerce'

    if (path.includes('/account/profile')) return 'Profile'
    if (path.includes('/account/settings')) return 'Settings'
    if (path.includes('/account/billing')) return 'Billing'
    if (path.includes('/account/ecommerce/products')) return 'Products'
    if (path.includes('/account/ecommerce/orders')) return 'Orders'
    if (path.includes('/account/ecommerce/sales')) return 'Sales'
    if (path === '/account/ecommerce') return 'E-commerce'
    return 'E-commerce'
  }

  const [selectedSection, setSelectedSection] = useState<Section>(getSectionFromPath(pathname))
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)

  useEffect(() => {
    setSelectedSection(getSectionFromPath(pathname))
  }, [pathname])

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
        className={`w-64 bg-white border rounded shadow-lg ${inter.variable}`}
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

  const VerticalSidebar = () => (
    <div className="w-64 bg-gray-100 h-screen p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-bold text-gray-600 uppercase text-xs tracking-wider pl-2">My Account</h3>
        <div className="space-y-1">
          {(['Profile', 'Settings', 'Billing'] as Section[]).map((section) => (
            <Link
              key={section}
              href={`/account/${section.toLowerCase()}`}
              className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                selectedSection === section
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              {section === 'Profile' && <User className="h-5 w-5" />}
              {section === 'Settings' && <Settings className="h-5 w-5" />}
              {section === 'Billing' && <CreditCard className="h-5 w-5" />}
              <span>{section}</span>
            </Link>
          ))}
        </div>
        <h3 className="font-bold text-gray-600 uppercase text-xs tracking-wider pl-2 mt-4">Workspaces</h3>
        <div className="space-y-1">
          {(['E-commerce', 'Products', 'Orders', 'Sales'] as Section[]).map((section) => (
            <Link
              key={section}
              href={section === 'E-commerce'
                ? '/account/ecommerce'
                : `/account/ecommerce/${section.toLowerCase()}`
              }
              className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                selectedSection === section
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              {section === 'Orders' && <ShoppingCart className="h-5 w-5" />}
              {section === 'Products' && <Package className="h-5 w-5" />}
              {section === 'Sales' && <List className="h-5 w-5" />}
              {section === 'E-commerce' && <ShoppingCart className="h-5 w-5" />}
              <span>{section}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )

  const HorizontalToolbar = () => {
    switch (selectedSection) {
      case 'Profile':
        return (
          <div className="w-full bg-gray-100 p-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Management</span>
              </div>
            </div>
            <AccountDropdown />
          </div>
        )
      case 'E-commerce':
        return (
          <div className="w-full bg-gray-100 p-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>E-commerce Management</span>
              </div>
            </div>
            <AccountDropdown />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex">
      <VerticalSidebar />
      <div className="flex-1 flex flex-col">
        <div className="w-full bg-gray-50 border-b">
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
