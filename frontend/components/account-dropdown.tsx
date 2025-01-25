"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  User,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  List,
  Rocket,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserInfo } from "@/app/_components/user-info";
import { useProfile } from "@/hooks/use-profile";

export const AccountDropdown = () => {
  const router = useRouter();
  const { checkPermission } = useProfile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gnome-dark/5 dark:hover:bg-white/5 p-2 rounded-md transition-all duration-200">
          <UserInfo />
          <ChevronDown className="h-4 w-4 text-gnome-dark dark:text-white" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-white dark:bg-gnome-dark border border-gnome-dark/10 dark:border-white/10 shadow-gnome"
      >
        <div className="py-1">
          <div className="px-4 py-2 font-semibold text-gnome-dark dark:text-white border-b border-gnome-dark/10 dark:border-white/10">
            My Account
          </div>

          <DropdownMenuItem
            onSelect={() => router.push("/account/profile")}
            className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push("/account/settings")}
            className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push("/account/billing")}
            className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push("/account/ecommerce")}
            className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>E-commerce</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push("/account/integrations")}
            className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
          >
            <Rocket className="h-4 w-4" />
            <span>Integrations</span>
          </DropdownMenuItem>

          {checkPermission("canManageCompanyUsers") && (
            <DropdownMenuItem
              onSelect={() => router.push("/account/users")}
              className="px-4 py-2 hover:bg-gnome-dark/5 dark:hover:bg-white/5 flex items-center space-x-2 cursor-pointer text-gnome-dark/70 dark:text-white/70"
            >
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </DropdownMenuItem>
          )}

          <div className="border-t border-gnome-dark/10 dark:border-white/10">
            <DropdownMenuItem
              onSelect={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 hover:bg-gnome-red/10 flex items-center space-x-2 cursor-pointer text-gnome-red"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
