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
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export const AccountDropdown = () => {
  const { data: session } = useSession();
  const router = useRouter();

  return (
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

          <div className="border-t my-1" />
          <div className="px-4 py-2 font-semibold text-gray-600 border-b">Workspaces</div>

          <DropdownMenuItem
            onSelect={() => router.push('/account/integrations')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <List className="h-4 w-4" />
            <span>Integrations</span>
          </DropdownMenuItem>
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

          <div className="border-t my-1" />
          <div className="px-4 py-2 font-semibold text-gray-600 border-b">Social Media</div>

          <DropdownMenuItem
            onSelect={() => router.push('/account/social-media/creators')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span>Creators</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push('/account/social-media/campaigns')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <Rocket className="h-4 w-4" />
            <span>Campaigns</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push('/account/social-media/posts')}
            className="px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
          >
            <List className="h-4 w-4" />
            <span>Posts</span>
          </DropdownMenuItem>

          <div className="border-t my-1" />
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
}
