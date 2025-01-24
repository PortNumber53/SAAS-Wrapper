"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  ShoppingCart,
  User,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  List,
  Rocket
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserInfo } from '@/app/_components/user-info'

export const AccountDropdown = () => {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-2 rounded">
          <UserInfo />
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

          <DropdownMenuItem
            onSelect={() => router.push('/account/ecommerce')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>E-commerce</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push('/account/integrations')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <Rocket className="h-4 w-4" />
            <span>Integrations</span>
          </DropdownMenuItem>

          <div className="border-t">
            <DropdownMenuItem
              onSelect={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
