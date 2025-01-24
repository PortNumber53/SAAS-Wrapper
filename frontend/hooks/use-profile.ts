import { useSession } from 'next-auth/react';
import { ProfilePermissions, getProfilePermissions } from '@/lib/profile-utils';

/**
 * This hook is for UI purposes only.
 * Do not rely on it for security-critical decisions.
 * Always use server-side checks for actual authorization.
 */
export function useProfile() {
  const { data: session } = useSession();
  
  const checkPermission = (permission: keyof ProfilePermissions) => {
    if (!session?.user?.profile) {
      return false;
    }
    const permissions = getProfilePermissions(session.user.profile);
    return permissions[permission];
  };
  
  return {
    profile: session?.user?.profile,
    checkPermission,
    // These are for UI rendering only
    isAdmin: session?.user?.profile === 'admin',
    isUser: session?.user?.profile === 'user',
  };
}
