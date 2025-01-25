import { redirect } from "next/navigation";
import { xata } from "./xata";
import {
  ProfilePermissions,
  getProfilePermissions,
  UserProfile,
} from "./profile-utils";
import type { NextauthUsersRecord } from "@/vendor/xata";
import { auth } from "@/app/auth";
import { unstable_noStore } from "next/cache";

export async function requirePermission(
  permission: keyof ProfilePermissions
): Promise<NextauthUsersRecord> {
  unstable_noStore();
  const session = await auth();
  if (!session?.user?.id) {
    console.log("[Auth] No session user ID");
    redirect("/login");
  }

  // Always fetch fresh user data from database
  const user = await xata.db.nextauth_users.read(session.user.id);
  if (!user) {
    console.log("[Auth] User not found in database");
    redirect("/login");
  }

  console.log("[Auth] User data:", {
    id: user.id,
    profile: user.profile,
    hasCompany: !!user.company,
    companyId: user.company?.id,
    requestedPermission: permission,
  });

  const permissions = getProfilePermissions(user.profile as UserProfile);
  console.log("[Auth] User permissions:", permissions);

  // For user management, check both permissions
  if (permission === "canManageCompanyUsers") {
    // Allow access if user has either permission
    if (permissions.canManageUsers || permissions.canManageCompanyUsers) {
      // Admin users still need a company
      if (user.profile === "admin" && !user.company) {
        console.log("[Auth] Admin user without company, access denied");
        redirect("/");
      }
      console.log("[Auth] Access granted via user management permissions");
      return user;
    }

    console.log("[Auth] Access denied - missing required permissions");
    redirect("/");
  }

  // For other permissions, check directly
  if (!permissions[permission]) {
    console.log("[Auth] Access denied - missing permission:", permission);
    redirect("/");
  }

  return user;
}

export async function getUserProfile(): Promise<NextauthUsersRecord | null> {
  unstable_noStore();
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Always fetch fresh user data from database
  const user = await xata.db.nextauth_users.read(session.user.id);
  return user;
}
