import { signOut as nextAuthSignOut } from "next-auth/react";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const AUTH_ERROR_MESSAGES = {
  INVALID_SESSION: "Your session has expired. Please sign in again.",
  VERIFICATION_FAILED: "Session verification failed. Please sign in again.",
  USER_NOT_FOUND: "User account not found. Please contact support.",
  GENERAL_ERROR: "An authentication error occurred. Please try again."
} as const;

export async function handleLogout(redirectPath: string = '/login', error?: keyof typeof AUTH_ERROR_MESSAGES) {
  const redirectUrl = new URL(redirectPath, window.location.origin);
  if (error) {
    redirectUrl.searchParams.set('error', error);
  }
  
  await nextAuthSignOut({ 
    redirect: true,
    callbackUrl: redirectUrl.toString()
  });
}

export function handleServerLogout(request: NextRequest, error?: keyof typeof AUTH_ERROR_MESSAGES) {
  const redirectUrl = new URL('/login', request.url);
  if (error) {
    redirectUrl.searchParams.set('error', error);
  }

  const response = NextResponse.redirect(redirectUrl);
  
  // Clear all auth-related cookies
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('next-auth.callback-url');
  response.cookies.delete('next-auth.csrf-token');
  
  return response;
}

export function isSessionExpired(sessionExpiryDate: Date | null): boolean {
  if (!sessionExpiryDate) return true;
  
  // Add a small buffer (5 minutes) to handle clock skew
  const bufferMs = 5 * 60 * 1000;
  return new Date(sessionExpiryDate).getTime() - bufferMs < Date.now();
}
