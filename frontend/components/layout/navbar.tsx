"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  BookIcon,
  RocketIcon,
  CreditCardIcon,
  PlugIcon,
  ChevronDown,
  User,
  Settings,
  ShoppingCart,
  List,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleLogout } from "@/lib/auth-utils";
import { AccountDropdown } from "@/components/account-dropdown";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Check if the current path is within the account section
  const isAccountPage = pathname && pathname.startsWith("/account/");

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
                  href="/ecommerce/browse"
                  className="text-muted-foreground hover:text-foreground flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Products</span>
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
                <AccountDropdown />
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
  );
}
