"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Package,
  List,
  User,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
  PlugIcon,
  RocketIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { AccountDropdown } from "@/components/account-dropdown";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type Section =
  | "Integrations"
  | "E-commerce"
  | "Products"
  | "Orders"
  | "Subscriptions"
  | "Profile"
  | "Settings"
  | "Billing"
  | "Social Media"
  | "Creators"
  | "Campaigns"
  | "Posts";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const getSectionFromPath = (path: string | null): Section => {
    if (!path) return "E-commerce";

    if (path.includes("/account/profile")) return "Profile";
    if (path.includes("/account/settings")) return "Settings";
    if (path.includes("/account/billing")) return "Billing";
    if (path.includes("/account/integrations")) return "Integrations";
    if (path.includes("/account/ecommerce/products")) return "Products";
    if (path.includes("/account/ecommerce/orders")) return "Orders";
    if (path.includes("/account/ecommerce/subscriptions"))
      return "Subscriptions";
    if (path.includes("/account/ecommerce")) return "E-commerce";
    if (path.includes("/account/social-media/creators")) return "Creators";
    if (path.includes("/account/social-media/campaigns")) return "Campaigns";
    if (path.includes("/account/social-media/posts")) return "Posts";
    return "E-commerce";
  };

  const [selectedSection, setSelectedSection] = useState<Section>(
    getSectionFromPath(pathname)
  );
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  useEffect(() => {
    setSelectedSection(getSectionFromPath(pathname));
  }, [pathname]);

  const VerticalSidebar = () => (
    <div className="w-64 bg-gnome-light dark:bg-gnome-dark h-screen p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-bold text-gnome-dark dark:text-white uppercase text-xs tracking-wider pl-2">
          My Account
        </h3>
        <div className="space-y-1">
          {(["Profile", "Settings", "Billing"] as Section[]).map((section) => (
            <Link
              key={section}
              href={`/account/${section.toLowerCase()}`}
              className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-200 ${
                selectedSection === section
                  ? "bg-gnome-blue text-white shadow-gnome-sm"
                  : "hover:bg-black/5 dark:hover:bg-white/10 text-gnome-dark dark:text-white"
              }`}
            >
              {section === "Profile" && <User className="h-5 w-5" />}
              {section === "Settings" && <Settings className="h-5 w-5" />}
              {section === "Billing" && <CreditCard className="h-5 w-5" />}
              <span>{section}</span>
            </Link>
          ))}
        </div>
        <h3 className="font-bold text-gnome-dark dark:text-white uppercase text-xs tracking-wider pl-2 mt-4">
          Workspaces
        </h3>
        <div className="space-y-1">
          {(
            [
              "Integrations",
              "E-commerce",
              "Products",
              "Orders",
              "Subscriptions",
            ] as Section[]
          ).map((section) => (
            <Link
              key={section}
              href={
                section === "E-commerce"
                  ? "/account/ecommerce"
                  : section === "Integrations"
                  ? "/account/integrations"
                  : `/account/ecommerce/${section.toLowerCase()}`
              }
              className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-200 ${
                selectedSection === section
                  ? "bg-gnome-blue text-white shadow-gnome-sm"
                  : "hover:bg-black/5 dark:hover:bg-white/10 text-gnome-dark dark:text-white"
              }`}
            >
              {section === "Integrations" && <PlugIcon className="h-5 w-5" />}
              {section === "E-commerce" && <ShoppingCart className="h-5 w-5" />}
              {section === "Products" && <List className="h-5 w-5" />}
              {section === "Orders" && <List className="h-5 w-5" />}
              {section === "Subscriptions" && <List className="h-5 w-5" />}
              <span>{section}</span>
            </Link>
          ))}
        </div>
        <h3 className="font-bold text-gnome-dark dark:text-white uppercase text-xs tracking-wider pl-2 mt-4">
          Social Media
        </h3>
        <div className="space-y-1">
          {(["Creators", "Campaigns", "Posts"] as Section[]).map((section) => (
            <Link
              key={section}
              href={`/account/social-media/${section.toLowerCase()}`}
              className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-200 ${
                selectedSection === section
                  ? "bg-gnome-blue text-white shadow-gnome-sm"
                  : "hover:bg-black/5 dark:hover:bg-white/10 text-gnome-dark dark:text-white"
              }`}
            >
              {section === "Creators" && <User className="h-5 w-5" />}
              {section === "Campaigns" && <RocketIcon className="h-5 w-5" />}
              {section === "Posts" && <List className="h-5 w-5" />}
              <span>{section}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const HorizontalToolbar = () => {
    switch (selectedSection) {
      case "Profile":
        return (
          <div className="w-full bg-gnome-light dark:bg-gnome-dark p-3 flex items-center justify-between shadow-gnome-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium text-gnome-dark dark:text-white">
                  Profile Management
                </span>
              </div>
            </div>
            <AccountDropdown />
          </div>
        );
      case "E-commerce":
        return (
          <div className="w-full bg-gnome-light dark:bg-gnome-dark p-3 flex items-center justify-between shadow-gnome-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-medium text-gnome-dark dark:text-white">
                  E-commerce Management
                </span>
              </div>
            </div>
            <AccountDropdown />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      <VerticalSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
