"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { User, Settings, CreditCard, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/use-toast";
import { AccountDropdown } from "@/components/account-dropdown";
import { PageTitleProvider, usePageTitle } from "@/lib/page-title-context";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

function TopNavbar() {
  const pathname = usePathname();
  const { title, icon: Icon } = usePageTitle();

  if (pathname?.startsWith("/account")) {
    return (
      <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              SW
            </div>
            <span className="text-xl font-bold text-gray-800 pr-16">
              SaaS Wrapper
            </span>
          </Link>
          <div className="ml-6 flex items-center space-x-2">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{title || "Dashboard"}</span>
          </div>
        </div>
        <AccountDropdown />
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            SW
          </div>
          <span className="text-xl font-bold text-gray-800 pr-16">
            SaaS Wrapper
          </span>
        </Link>
        <nav className="ml-6 flex space-x-4">
          <Link
            href="#features"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Features
          </Link>
          <Link
            href="#docs"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Docs
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Pricing
          </Link>
        </nav>
      </div>
      <AccountDropdown />
    </div>
  );
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <div
      className={cn(
        inter.className,
        "font-sans antialiased flex flex-col min-h-screen"
      )}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <PageTitleProvider>
          {pathname?.startsWith("/account") ? <TopNavbar /> : <Navbar />}
          <div className="flex flex-1">
            <main className="flex-1">
              {status === "loading" ? (
                <div className="flex items-center justify-center h-screen">
                  Loading...
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </PageTitleProvider>
      </ThemeProvider>
    </div>
  );
}
