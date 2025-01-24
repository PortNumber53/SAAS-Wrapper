import { Session } from "next-auth";

export type UserProfile = "god" | "admin" | "user";

export interface ProfilePermissions {
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canEditContent: boolean;
  canManageProducts: boolean;
}

export function getProfilePermissions(
  profile: UserProfile
): ProfilePermissions {
  switch (profile) {
    case "god":
      return {
        canAccessAdmin: true,
        canManageUsers: true,
        canEditContent: true,
        canManageProducts: true,
      };
    case "admin":
      return {
        canAccessAdmin: true,
        canManageUsers: false,
        canEditContent: true,
        canManageProducts: true,
      };
    case "user":
    default:
      return {
        canAccessAdmin: false,
        canManageUsers: false,
        canEditContent: false,
        canManageProducts: false,
      };
  }
}

export function hasPermission(
  session: Session | null,
  permission: keyof ProfilePermissions
): boolean {
  if (!session?.user?.profile) {
    return false;
  }

  const permissions = getProfilePermissions(
    session.user.profile as UserProfile
  );
  return permissions[permission];
}

// Helper to check if a route should be accessible based on profile
export function isRouteAccessible(
  pathname: string,
  profile: UserProfile
): boolean {
  const permissions = getProfilePermissions(profile);

  // Admin-only routes
  if (pathname.startsWith("/admin") && !permissions.canAccessAdmin) {
    return false;
  }

  // Content management routes
  if (pathname.startsWith("/e/") && !permissions.canEditContent) {
    return false;
  }

  return true;
}
